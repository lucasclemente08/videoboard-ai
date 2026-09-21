export interface SerializedShot {
  id?: string;
  name: string;
  description?: string | null;
  shot_type?: string | null;
  movement?: string | null;
  lens?: string | null;
  fps?: number | null;
  resolution?: string | null;
  estimated_duration_secs?: number | null;
  camera_letter?: string | null;
  camera_setup?: any;
  lighting_setup?: any;
  sort_order?: number;
}

export interface SerializedScene {
  id?: string;
  title: string;
  objective?: string | null;
  description?: string | null;
  estimated_duration_secs?: number | null;
  color?: string | null;
  tags?: string[] | null;
  scene_type?: string | null;
  emotion?: string | null;
  position_x?: number;
  position_y?: number;
  sort_order?: number;
  shots?: SerializedShot[];
}

export interface SerializedProjectBundle {
  project: {
    id?: string;
    title: string;
    description?: string | null;
    estimated_duration_secs?: number | null;
    status?: string | null;
    cover_url?: string | null;
  };
  scenes: SerializedScene[];
}

/**
 * Converts a project bundle (project, scenes, shots) to clean Markdown format
 */
export function projectToMarkdown(bundle: SerializedProjectBundle): string {
  const { project, scenes = [] } = bundle;
  const lines: string[] = [];

  // Project Header
  lines.push(`# ${project.title || 'Proyecto Sin Título'}`);
  lines.push('');
  if (project.description) {
    lines.push(`> Sinopsis: ${project.description.replace(/\n/g, ' ')}`);
  }
  const totalSecs = scenes.reduce((acc, s) => acc + (s.estimated_duration_secs || 0), 0);
  lines.push(`> Duración Estimada: ${totalSecs || project.estimated_duration_secs || 0}s | Estado: ${project.status || 'planning'}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // Scenes
  for (let i = 0; i < scenes.length; i++) {
    const sc = scenes[i];
    const sceneNum = i + 1;
    const cleanTitle = sc.title.replace(/^\d+[\.\-\s]*/, '').trim() || `Escena ${sceneNum}`;
    lines.push(`## Escena ${sceneNum}: ${cleanTitle}`);

    if (sc.objective) {
      lines.push(`- **Objetivo:** ${sc.objective}`);
    }
    if (sc.description) {
      lines.push(`- **Descripción:** ${sc.description}`);
    }
    if (sc.estimated_duration_secs) {
      lines.push(`- **Duración:** ${sc.estimated_duration_secs}s`);
    }
    if (sc.color) {
      lines.push(`- **Color:** ${sc.color}`);
    }
    if (sc.tags && sc.tags.length > 0) {
      lines.push(`- **Tags:** ${sc.tags.join(', ')}`);
    }
    if (sc.emotion) {
      lines.push(`- **Emoción:** ${sc.emotion}`);
    }
    if (sc.scene_type) {
      lines.push(`- **Tipo de Escena:** ${sc.scene_type}`);
    }

    // Shots inside scene
    const shotsList = sc.shots || [];
    if (shotsList.length > 0) {
      lines.push('');
      for (let j = 0; j < shotsList.length; j++) {
        const sh = shotsList[j];
        const shotNum = j + 1;
        const cleanShotName = sh.name.replace(/^(Plano|Shot)\s*\d+[\.\-\s]*/i, '').trim() || `Plano ${shotNum}`;
        lines.push(`### Plano ${shotNum}: ${cleanShotName}`);

        if (sh.description) {
          lines.push(`- **Descripción:** ${sh.description}`);
        }
        if (sh.shot_type) {
          lines.push(`- **Tipo:** ${sh.shot_type}`);
        }
        if (sh.movement) {
          lines.push(`- **Movimiento:** ${sh.movement}`);
        }
        if (sh.lens) {
          lines.push(`- **Lente:** ${sh.lens}`);
        }
        if (sh.fps) {
          lines.push(`- **FPS:** ${sh.fps}`);
        }
        if (sh.resolution) {
          lines.push(`- **Resolución:** ${sh.resolution}`);
        }
        if (sh.estimated_duration_secs) {
          lines.push(`- **Duración:** ${sh.estimated_duration_secs}s`);
        }
        if (sh.camera_letter) {
          lines.push(`- **Cámara:** ${sh.camera_letter}`);
        }
        if (sh.lighting_setup) {
          const lightStr = typeof sh.lighting_setup === 'string'
            ? sh.lighting_setup
            : (sh.lighting_setup.style || JSON.stringify(sh.lighting_setup));
          lines.push(`- **Iluminación:** ${lightStr}`);
        }
        lines.push('');
      }
    } else {
      lines.push('');
    }
  }

  return lines.join('\n').trim() + '\n';
}

/**
 * Robust parser from Markdown to SerializedProjectBundle
 */
export function markdownToProject(mdContent: string): SerializedProjectBundle {
  const lines = mdContent.split('\n');

  let projectTitle = 'Proyecto Importado';
  let projectDescription = '';
  let projectStatus = 'planning';

  const scenes: SerializedScene[] = [];
  let currentScene: SerializedScene | null = null;
  let currentShot: SerializedShot | null = null;

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    // 1. Level 1 Heading: # Project Title
    if (line.startsWith('# ') && !line.startsWith('## ') && !line.startsWith('### ')) {
      projectTitle = line.replace(/^#\s+/, '').trim();
      continue;
    }

    // 2. Synopsis / Metadata in blockquote
    if (line.startsWith('>')) {
      const quoteText = line.replace(/^>\s*/, '').trim();
      if (/sinopsis|descripci[oó]n:/i.test(quoteText)) {
        projectDescription = quoteText.replace(/^(sinopsis|descripci[oó]n):\s*/i, '').trim();
      } else if (/duraci[oó]n|estado/i.test(quoteText)) {
        const statusMatch = quoteText.match(/estado:\s*([a-zA-Z0-9_]+)/i);
        if (statusMatch) projectStatus = statusMatch[1].toLowerCase();
      } else if (!projectDescription) {
        projectDescription = quoteText;
      }
      continue;
    }

    // 3. Level 2 Heading: ## Escena X: Title / ## Scene X: Title
    if (line.startsWith('## ') && !line.startsWith('### ')) {
      const rawHeading = line.replace(/^##\s+/, '').trim();
      currentShot = null;

      currentScene = {
        title: rawHeading,
        objective: '',
        description: '',
        estimated_duration_secs: 5,
        color: '#3B82F6',
        tags: [],
        scene_type: 'action',
        emotion: 'neutral',
        shots: [],
      };
      scenes.push(currentScene);
      continue;
    }

    // 4. Level 3 Heading: ### Plano Y: Name / ### Shot Y: Name
    if (line.startsWith('### ')) {
      const rawShotHeading = line.replace(/^###\s+/, '').trim();
      if (!currentScene) {
        // Create fallback scene if shot is placed before any scene
        currentScene = {
          title: 'Escena 1: General',
          estimated_duration_secs: 5,
          color: '#3B82F6',
          shots: [],
        };
        scenes.push(currentScene);
      }

      currentShot = {
        name: rawShotHeading,
        description: '',
        shot_type: 'medium',
        movement: 'static',
        lens: '35mm',
        fps: 24,
        resolution: '1920x1080',
        estimated_duration_secs: 5,
        camera_letter: 'A',
      };
      currentScene.shots!.push(currentShot);
      continue;
    }

    // 5. Bullet points (- **Key:** Value or * **Key:** Value or - Key: Value)
    if (line.startsWith('- ') || line.startsWith('* ')) {
      const stripped = line.replace(/^[-*]\s*/, '').trim();
      const colonIndex = stripped.indexOf(':');
      if (colonIndex > 0) {
        const key = stripped.slice(0, colonIndex).replace(/\*/g, '').trim().toLowerCase();
        const val = stripped.slice(colonIndex + 1).replace(/^\*+|\*+$/g, '').trim();

      // If we are currently inside a Shot
      if (currentShot) {
        if (/descripci[oó]n|notas?/i.test(key)) {
          currentShot.description = val;
        } else if (/tipo|shot[_\s]?type/i.test(key)) {
          currentShot.shot_type = val.toLowerCase();
        } else if (/movimiento|movement/i.test(key)) {
          currentShot.movement = val.toLowerCase();
        } else if (/lente|lens/i.test(key)) {
          currentShot.lens = val;
        } else if (/fps|cuadros/i.test(key)) {
          const fpsNum = parseInt(val, 10);
          if (!isNaN(fpsNum)) currentShot.fps = fpsNum;
        } else if (/resoluci[oó]n/i.test(key)) {
          currentShot.resolution = val;
        } else if (/duraci[oó]n/i.test(key)) {
          const dur = parseFloat(val.replace(/s/gi, ''));
          if (!isNaN(dur)) currentShot.estimated_duration_secs = Math.round(dur);
        } else if (/c[aá]mara/i.test(key)) {
          currentShot.camera_letter = val;
        } else if (/iluminaci[oó]n|lighting/i.test(key)) {
          currentShot.lighting_setup = { style: val };
        }
      }
      // Else if we are inside a Scene
      else if (currentScene) {
        if (/objetivo|prop[oó]sito/i.test(key)) {
          currentScene.objective = val;
        } else if (/descripci[oó]n/i.test(key)) {
          currentScene.description = val;
        } else if (/duraci[oó]n/i.test(key)) {
          const dur = parseFloat(val.replace(/s/gi, ''));
          if (!isNaN(dur)) currentScene.estimated_duration_secs = Math.round(dur);
        } else if (/color/i.test(key)) {
          currentScene.color = val;
        } else if (/tags?|etiquetas?/i.test(key)) {
          currentScene.tags = val.split(',').map((t) => t.trim().toUpperCase()).filter(Boolean);
        } else if (/emoci[oó]n|emotion/i.test(key)) {
          currentScene.emotion = val;
        } else if (/tipo/i.test(key)) {
          currentScene.scene_type = val.toLowerCase();
        }
      }
    }
  }
  }

  // Ensure at least 1 scene
  if (scenes.length === 0) {
    scenes.push({
      title: 'Escena 1',
      estimated_duration_secs: 10,
      shots: [
        {
          name: 'Plano 1 - Master',
          description: 'Plano general de establecimiento',
          shot_type: 'wide',
          lens: '35mm',
          fps: 24,
          estimated_duration_secs: 10,
        },
      ],
    });
  }

  const totalDuration = scenes.reduce((acc, s) => acc + (s.estimated_duration_secs || 5), 0);

  return {
    project: {
      title: projectTitle,
      description: projectDescription || undefined,
      estimated_duration_secs: totalDuration,
      status: projectStatus,
    },
    scenes,
  };
}
