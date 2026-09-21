const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOT_DIR = path.join(__dirname, 'ux_screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runUXTests() {
  console.log('🚀 Iniciando pruebas automatizadas de UX/UI con Chrome headless...');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  const consoleErrors = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', (err) => {
    consoleErrors.push(err.message);
  });

  try {
    // 1. Login Page
    console.log('1. Probando flujo de autenticación y Login...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0', timeout: 15000 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_login.png') });

    // Click demo mode button
    await page.waitForSelector('button');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const demo = btns.find(b => b.textContent.includes('demo') || b.textContent.includes('Demo'));
      if (demo) demo.click();
    });

    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 2000));

    // 2. Home / Dashboard
    console.log('2. Probando Home y listado de proyectos...');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_home.png') });

    // Look for project card or create one if none
    const projectCard = await page.$('a[href^="/project/"], div[data-project-id]');
    let projectId = '';

    if (!projectCard) {
      console.log('   Creando nuevo proyecto de prueba...');
      // Click "Nuevo proyecto"
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const createBtn = btns.find(b => b.textContent.includes('Nuevo') || b.textContent.includes('Crear'));
        if (createBtn) createBtn.click();
      });
      await new Promise(r => setTimeout(r, 1500));
    }

    // Click on the first project
    const navigated = await page.evaluate(() => {
      const projLink = document.querySelector('a[href^="/project/"]');
      if (projLink) {
        projLink.click();
        return true;
      }
      return false;
    });

    if (navigated) {
      await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 }).catch(() => {});
    } else {
      // Fallback: get project from API or URL
      const url = page.url();
      if (!url.includes('/project/')) {
        // Try clicking any card or get from API
        await page.evaluate(async () => {
          const res = await fetch('/api/projects');
          const json = await res.json();
          if (json.data && json.data.length > 0) {
            window.location.href = `/project/${json.data[0].id}`;
          }
        });
        await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 }).catch(() => {});
      }
    }

    await new Promise(r => setTimeout(r, 2500));
    console.log('3. Probando Lienzo Infinito (Canvas View)... URL:', page.url());

    // Check if there are scenes; if not, create 2 scenes via the toolbar "+ Añadir" button
    const sceneCount = await page.evaluate(async () => {
      let nodes = document.querySelectorAll('.react-flow__node-sceneNode');
      if (nodes.length === 0) {
        const addBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Añadir'));
        if (addBtn) {
          addBtn.click();
          await new Promise(r => setTimeout(r, 400));
          const escenaBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Escena'));
          if (escenaBtn) escenaBtn.click();
          await new Promise(r => setTimeout(r, 1200));

          // Add a second scene for connection
          addBtn.click();
          await new Promise(r => setTimeout(r, 400));
          const escenaBtn2 = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Escena'));
          if (escenaBtn2) escenaBtn2.click();
          await new Promise(r => setTimeout(r, 1200));
        }
      }
      return document.querySelectorAll('.react-flow__node-sceneNode').length;
    });

    console.log('   Escenas disponibles en lienzo:', sceneCount);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_canvas_view.png') });

    // 4. Click a scene to open the Scene Panel
    console.log('4. Seleccionando escena para probar el Panel de Escena personalizable...');
    await page.evaluate(() => {
      const sceneNode = document.querySelector('.react-flow__node-sceneNode');
      if (sceneNode) {
        sceneNode.click();
      }
    });

    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_scene_panel_info.png') });

    // 5. Test expanding the scene panel to 540px
    console.log('5. Probando alternancia de ancho de panel (Expandido)...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('aside button'));
      const expandBtn = btns.find(b => b.title && b.title.includes('Expandir'));
      if (expandBtn) expandBtn.click();
    });
    await new Promise(r => setTimeout(r, 800));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_scene_panel_wide.png') });

    // 6. Test opening the "Tomas" (Shots) Tab in the Scene Panel
    console.log('6. Probando pestaña de Tomas y carga de archivos...');
    await page.evaluate(() => {
      const tabBtns = Array.from(document.querySelectorAll('aside button'));
      const shotsTab = tabBtns.find(b => b.textContent.includes('Tomas'));
      if (shotsTab) shotsTab.click();
    });
    await new Promise(r => setTimeout(r, 1200));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_shots_tab.png') });

    // Click "Añadir toma" if no shots exist
    await page.evaluate(() => {
      const addShotBtn = Array.from(document.querySelectorAll('aside button')).find(b => b.textContent.includes('Añadir toma'));
      if (addShotBtn) addShotBtn.click();
    });
    await new Promise(r => setTimeout(r, 1000));

    // Expand the first shot
    await page.evaluate(() => {
      const shotHeaders = document.querySelectorAll('aside .rounded-xl button');
      if (shotHeaders.length > 0) shotHeaders[0].click();
    });
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07_shot_expanded_dropzone.png') });

    // 7. Test Timeline View
    console.log('7. Probando vista de Timeline...');
    await page.evaluate(() => {
      const navBtns = Array.from(document.querySelectorAll('button, a'));
      const timelineBtn = navBtns.find(b => b.textContent.includes('Timeline') || b.textContent.includes('Línea de tiempo'));
      if (timelineBtn) timelineBtn.click();
    });
    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08_timeline_view.png') });

    // 8. Test Production View
    console.log('8. Probando vista de Producción...');
    await page.evaluate(() => {
      const navBtns = Array.from(document.querySelectorAll('button, a'));
      const prodBtn = navBtns.find(b => b.textContent.includes('Producción') || b.textContent.includes('Produccion'));
      if (prodBtn) prodBtn.click();
    });
    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09_production_view.png') });

    // 9. Test Checklist View
    console.log('9. Probando vista de Checklist...');
    await page.evaluate(() => {
      const navBtns = Array.from(document.querySelectorAll('button, a'));
      const checkBtn = navBtns.find(b => b.textContent.includes('Checklist') || b.textContent.includes('Hitos'));
      if (checkBtn) checkBtn.click();
    });
    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '10_checklist_view.png') });

    // 10. Test Attention Map View
    console.log('10. Probando vista de Mapa de Atención...');
    await page.evaluate(() => {
      const navBtns = Array.from(document.querySelectorAll('button, a'));
      const attBtn = navBtns.find(b => b.textContent.includes('Atención') || b.textContent.includes('Mapa'));
      if (attBtn) attBtn.click();
    });
    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '11_attention_map_view.png') });

    console.log('✅ Pruebas visuales completadas.');
    console.log('Errores de consola capturados:', consoleErrors.length);
    if (consoleErrors.length > 0) {
      console.log('Detalle de errores de consola:', consoleErrors.slice(0, 5));
    }

  } catch (err) {
    console.error('Error durante la prueba UX/UI:', err);
  } finally {
    await browser.close();
  }
}

runUXTests();
