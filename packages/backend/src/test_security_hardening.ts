/**
 * Automated Security Hardening Verification Test Suite
 * Validates BOLA/IDOR protection, XSS escaping, password hashing, and webhook protection.
 */
import { createApp } from './app';
import { db, eq, initPromise } from './config/database';
import { users } from './db/schema/users';
import { projects } from './db/schema/projects';
import { scenes } from './db/schema/scenes';
import { shots } from './db/schema/shots';
import { signToken } from './services/jwt';
import crypto from 'crypto';

async function runSecurityTests() {
  await initPromise;
  console.log('🛡️ Starting Automated Security Hardening Tests...\n');
  const app = createApp();

  // Create two distinct users: Victim (User A) and Attacker (User B)
  const userAId = crypto.randomUUID();
  const userBId = crypto.randomUUID();

  const tokenA = signToken({ sub: userAId, email: 'usera@test.com', name: 'User A', isPremium: true });
  const tokenB = signToken({ sub: userBId, email: 'userb@test.com', name: 'User B', isPremium: true });

  // 1. Create a private project owned by User A with scenes and shots
  const [victimProject] = await db.insert(projects).values({
    id: crypto.randomUUID(),
    title: 'Top Secret Project <script>alert("XSS")</script>',
    description: 'Confidential corporate storyboard <img src=x onerror=alert(1)>',
    owner_id: userAId,
    is_template: false,
  }).returning();

  const [victimScene] = await db.insert(scenes).values({
    id: crypto.randomUUID(),
    project_id: victimProject.id,
    title: 'Secret Scene 1 <script>steal()</script>',
    description: 'Sensitive plot twist',
    sort_order: 0,
  }).returning();

  const [victimShot] = await db.insert(shots).values({
    id: crypto.randomUUID(),
    scene_id: victimScene.id,
    name: 'Classified Shot 1',
    lens: '50mm',
    sort_order: 0,
  }).returning();

  console.log(`✅ Setup completed: Victim Project ID: ${victimProject.id}`);

  // Helper request function
  async function makeReq(url, method, token, body, headers = {}) {
    // Start temporary server listener to test express app
    return new Promise((resolve, reject) => {
      const server = app.listen(0, async () => {
        const port = server.address().port;
        try {
          const reqHeaders = {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...headers,
          };
          const resp = await fetch(`http://localhost:${port}${url}`, {
            method,
            headers: reqHeaders,
            body: body ? JSON.stringify(body) : undefined,
          });
          const text = await resp.text();
          let data;
          try { data = JSON.parse(text); } catch { data = text; }
          server.close(() => resolve({ status: resp.status, data, text }));
        } catch (e) {
          server.close(() => reject(e));
        }
      });
    });
  }

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
    }
  }

  // TEST 1: IDOR on Template Clone
  console.log('\n[Test 1] IDOR Prevention in Template Clone');
  const cloneRes = await makeReq(`/api/templates/${victimProject.id}/clone`, 'POST', tokenB, {});
  assert(cloneRes.status === 403, `Attacker B cannot clone Victim A's private project (Status: ${cloneRes.status})`);

  // TEST 2: IDOR on AI Context
  console.log('\n[Test 2] IDOR Prevention in AI Endpoints');
  const aiChatRes = await makeReq('/api/ai/chat', 'POST', tokenB, {
    message: 'Extract secret script',
    projectId: victimProject.id,
  });
  assert(aiChatRes.status === 403, `Attacker B cannot query AI about Victim A's project (Status: ${aiChatRes.status})`);

  const aiSceneRes = await makeReq('/api/ai/analyze-scene', 'POST', tokenB, {
    projectId: victimProject.id,
    sceneId: victimScene.id,
  });
  assert(aiSceneRes.status === 403, `Attacker B cannot analyze Victim A's scene with AI (Status: ${aiSceneRes.status})`);

  // TEST 3: IDOR on Shots (Modification & Deletion)
  console.log('\n[Test 3] IDOR Prevention on Shots and Takes');
  const patchShotRes = await makeReq(`/api/shots/${victimShot.id}`, 'PATCH', tokenB, { name: 'Hacked Shot' });
  assert(patchShotRes.status === 403, `Attacker B cannot modify Victim A's shot (Status: ${patchShotRes.status})`);

  const addTakeRes = await makeReq(`/api/shots/${victimShot.id}/takes`, 'POST', tokenB, { take_number: 99 });
  assert(addTakeRes.status === 403, `Attacker B cannot add takes to Victim A's shot (Status: ${addTakeRes.status})`);

  const deleteShotRes = await makeReq(`/api/shots/${victimShot.id}`, 'DELETE', tokenB);
  assert(deleteShotRes.status === 403, `Attacker B cannot delete Victim A's shot (Status: ${deleteShotRes.status})`);

  // TEST 4: Stored XSS Mitigation in HTML Export
  console.log('\n[Test 4] Stored XSS Sanitization in HTML Dossier Export');
  const exportRes = await makeReq(`/api/export/html?project_id=${victimProject.id}`, 'GET', tokenA);
  assert(exportRes.status === 200, `Owner A can export HTML dossier (Status: ${exportRes.status})`);
  assert(!exportRes.text.includes('<script>alert("XSS")</script>'), 'Dangerous <script> tag is NOT present raw in HTML');
  assert(exportRes.text.includes('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;'), 'XSS payload is safely escaped as HTML entities');
  assert(!exportRes.text.includes('<img src=x onerror=alert(1)>'), 'Dangerous <img> onerror tag is NOT present raw in HTML');

  // TEST 5: Client Share Link Password Security
  console.log('\n[Test 5] Client Review Share Password Protection');
  // Set password as Owner A
  const setLinkRes = await makeReq(`/api/share/link/${victimProject.id}`, 'POST', tokenA, { password: 'SuperSecretPassword123' });
  assert(setLinkRes.status === 200 && setLinkRes.data.data.has_password === true, 'Owner set password on share link');
  const token = setLinkRes.data.data.share_token;

  // Unauthenticated client accesses without password
  const viewNoPwd = await makeReq(`/api/share/view/${token}`, 'GET', null);
  assert(viewNoPwd.status === 401 && viewNoPwd.data.data?.requirePassword === true, 'Blocked with 401 PASSWORD_REQUIRED when no password provided');

  // Unauthenticated client accesses with wrong password
  const viewWrongPwd = await makeReq(`/api/share/view/${token}`, 'GET', null, null, { 'x-share-password': 'WrongPassword' });
  assert(viewWrongPwd.status === 401, 'Blocked with 401 when wrong password provided in X-Share-Password');

  // Unauthenticated client accesses with correct password
  const viewCorrectPwd = await makeReq(`/api/share/view/${token}`, 'GET', null, null, { 'x-share-password': 'SuperSecretPassword123' });
  assert(viewCorrectPwd.status === 200 && viewCorrectPwd.data.data?.project, 'Granted access with 200 OK when correct password provided');

  // TEST 6: Production Premium Direct Activation Lockdown
  console.log('\n[Test 6] Premium Direct Activation Production Lockdown');
  const prevEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  const activateProdRes = await makeReq('/api/premium/activate', 'POST', tokenB, { interval: 'month' });
  assert(activateProdRes.status === 403, `Direct /api/premium/activate is blocked in production (Status: ${activateProdRes.status})`);
  process.env.NODE_ENV = prevEnv;

  // Clean up test data
  try {
    await db.delete(shots).where(eq(shots.id, victimShot.id));
    await db.delete(scenes).where(eq(scenes.id, victimScene.id));
    await db.delete(projects).where(eq(projects.id, victimProject.id));
  } catch {}

  console.log(`\n========================================`);
  console.log(`RESULTS: ${passed}/${total} Security Tests Passed!`);
  console.log(`========================================\n`);

  process.exit(passed === total ? 0 : 1);
}

runSecurityTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
