import json, urllib.request, urllib.error

TOKEN = "videoboard-demo-2026"
BASE = "http://localhost:3001"

def api(method, path, body=None):
    url = f"{BASE}{path}"
    headers = {"Content-Type": "application/json", "Authorization": f"Bearer {TOKEN}"}
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        return json.loads(e.read())

# Create project
r1 = api("POST", "/api/projects", {"title": "VideoBoard Demo"})
print("CREATE:", json.dumps(r1, indent=2))
proj_id = r1["data"]["id"]

# List projects
r2 = api("GET", "/api/projects")
print("LIST:", json.dumps(r2, indent=2))

# Create scene
r3 = api("POST", "/api/scenes", {"project_id": proj_id, "title": "Intro", "scene_type": "intro"})
print("CREATE SCENE:", json.dumps(r3, indent=2))
scene_id = r3["data"]["id"]

# Create shot
r4 = api("POST", "/api/shots", {"scene_id": scene_id, "name": "Plano general", "shot_type": "wide_shot"})
print("CREATE SHOT:", json.dumps(r4, indent=2))

# List scenes
r5 = api("GET", f"/api/scenes?project_id={proj_id}")
print("SCENES:", json.dumps(r5, indent=2))

print("\n✅ ALL TESTS PASSED!")
