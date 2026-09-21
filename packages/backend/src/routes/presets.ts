import { Router } from 'express';
import { db, eq } from '../config/database';
import { cameraLightingPresets } from '../db/schema/presets';
import { authMiddleware, type AuthRequest } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';

export const presetsRouter = Router();
presetsRouter.use(authMiddleware);

export const SYSTEM_PRESETS = [
  {
    id: 'sys-preset-1',
    name: 'Entrevista Cinematográfica (3 Puntos)',
    description: 'Esquema clásico de Hollywood con luz principal suave, relleno balanceado y contra para separación de fondo.',
    category: 'interview',
    is_system: true,
    camera_setup: {
      camera_model: 'Sony FX3',
      sensor: 'Full Frame',
      lens: '50mm',
      aperture: 'f/1.8',
      focal_length: '50mm',
      fps: 24,
      shutter_speed: '1/48',
      iso: 800,
      color_profile: 'S-Log3 / S-Gamut3.Cine',
      nd_filter: 'ND 0.6 (2 stops)',
      aspect_ratio: '16:9',
    },
    lighting_setup: {
      scheme_name: '3-Point Lighting Clásico',
      mood: 'Natural / Cálido elegante',
      key_light: {
        name: 'Aputure 600d + Light Dome 150cm',
        type: 'Softbox Difusa',
        position: 'Frontal lateral (45° der)',
        color_temp: '5600K Daylight',
        intensity: 75,
        modifier: 'Grid / Nido de abeja 45°',
      },
      fill_light: {
        name: 'Panel LED Aputure Nova P300c / Rebote',
        type: 'Rebote Suave Pasivo',
        position: 'Frontal lateral (45° izq)',
        color_temp: '5600K',
        intensity: 35,
        modifier: 'Seda 1x1m',
      },
      back_light: {
        name: 'Tubo LED Amaran T2c',
        type: 'Rim / Hair Light',
        position: 'Posterior alto (135° izq)',
        color_temp: '4500K Neutro',
        intensity: 40,
        modifier: 'Viseras / Barn doors',
      },
      background_light: {
        name: 'Lámpara práctica decorativa',
        type: 'Práctica cálida',
        position: 'Fondo desenfocado',
        color_temp: '2700K Tungsteno',
        intensity: 50,
      },
      diagram: {
        key_angle: 315,
        fill_angle: 45,
        back_angle: 150,
        subject_pos: { x: 50, y: 50 },
        camera_angle: 0,
      },
    },
  },
  {
    id: 'sys-preset-2',
    name: 'Cyberpunk / Neón Urbano',
    description: 'Estilo cinematográfico nocturno con alto contraste cromático (Teal & Orange / Neón).',
    category: 'cinematic',
    is_system: true,
    camera_setup: {
      camera_model: 'Blackmagic Pocket 6K',
      sensor: 'Super 35',
      lens: '35mm Anamórfico',
      aperture: 'f/1.4',
      focal_length: '35mm',
      fps: 24,
      shutter_speed: '1/48',
      iso: 1600,
      color_profile: 'BRAW Film Gen 5',
      nd_filter: 'Ninguno / Mist 1/8',
      aspect_ratio: '2.39:1',
    },
    lighting_setup: {
      scheme_name: 'Bicolor Saturado (Cyan & Magenta)',
      mood: 'Distópico / Vibrante nocturno',
      key_light: {
        name: 'Nanlite Pavotube II 30C',
        type: 'Tubo RGB Led',
        position: 'Lateral rasante (60° der)',
        color_temp: 'Cyan / Teal (190°)',
        intensity: 85,
        modifier: 'Tubo directo',
      },
      fill_light: {
        name: 'Luz ambiental tenue',
        type: 'Luz difusa baja',
        position: 'Frontal',
        color_temp: 'Azul oscuro profundo',
        intensity: 20,
        modifier: 'Rebote negro para contraste',
      },
      back_light: {
        name: 'Tubo LED RGB Ámbar / Neón Naranja',
        type: 'Rim light intenso de recorte',
        position: 'Posterior rasante (140° der)',
        color_temp: 'Naranja / Ámbar saturado',
        intensity: 90,
        modifier: 'Directo perfilando silueta',
      },
      background_light: {
        name: 'Letrero de neón o pantalla LED',
        type: 'Bokeh practicals',
        position: 'Fondo lejano',
        color_temp: 'RGB dinámico',
        intensity: 70,
      },
      diagram: {
        key_angle: 300,
        fill_angle: 0,
        back_angle: 140,
        subject_pos: { x: 50, y: 50 },
        camera_angle: 0,
      },
    },
  },
  {
    id: 'sys-preset-3',
    name: 'Comercial High-Key (Luz Suave Día)',
    description: 'Iluminación limpia, brillante y optimista sin sombras duras. Ideal para belleza, tecnología y alimentos.',
    category: 'commercial',
    is_system: true,
    camera_setup: {
      camera_model: 'ARRI Alexa Mini LF',
      sensor: 'Large Format',
      lens: '35mm Prime',
      aperture: 'f/2.8',
      focal_length: '35mm',
      fps: 60,
      shutter_speed: '1/120',
      iso: 800,
      color_profile: 'ARRI LogC4',
      nd_filter: 'ND 0.9 (3 stops)',
      aspect_ratio: '16:9',
    },
    lighting_setup: {
      scheme_name: 'High-Key Comercial de Estudio',
      mood: 'Brillante / Impecable / Optimista',
      key_light: {
        name: 'Aputure 1200d Pro + Octabox 150cm',
        type: 'Softbox gigante ultra-suave',
        position: 'Frontal cenital (30° der, alto)',
        color_temp: '5600K Daylight',
        intensity: 90,
        modifier: 'Doble difusión seda',
      },
      fill_light: {
        name: 'Panel LED 2x2m con marco difusor',
        type: 'Luz de relleno envolvente',
        position: 'Frontal amplio (30° izq)',
        color_temp: '5600K',
        intensity: 65,
        modifier: 'Seda blanca difusora',
      },
      back_light: {
        name: 'Top Light suave desde parrilla de techo',
        type: 'Luz de pelo suave',
        position: 'Cenital directo',
        color_temp: '5600K',
        intensity: 50,
        modifier: 'Lantern Softbox',
      },
      background_light: {
        name: '2x Barras LED iluminando ciclorama blanco',
        type: 'Fondo blanco limpio (+1 EV)',
        position: 'Iluminación pareja de ciclorama',
        color_temp: '5600K',
        intensity: 95,
      },
      diagram: {
        key_angle: 330,
        fill_angle: 30,
        back_angle: 180,
        subject_pos: { x: 50, y: 50 },
        camera_angle: 0,
      },
    },
  },
  {
    id: 'sys-preset-4',
    name: 'Dramático Low-Key (Rembrandt / Noir)',
    description: 'Sombras profundas y dramáticas con el característico triángulo de luz Rembrandt en la mejilla opuesta.',
    category: 'cinematic',
    is_system: true,
    camera_setup: {
      camera_model: 'RED Komodo 6K',
      sensor: 'Super 35 Global Shutter',
      lens: '85mm f/1.4 Cine',
      aperture: 'f/1.4',
      focal_length: '85mm',
      fps: 24,
      shutter_speed: '1/48',
      iso: 800,
      color_profile: 'REDCODE RAW IPP2',
      nd_filter: 'ND 0.6',
      aspect_ratio: '2.39:1',
    },
    lighting_setup: {
      scheme_name: 'Rembrandt Clásico 45° Alto',
      mood: 'Misterioso / Tenso / Cinematográfico',
      key_light: {
        name: 'Fresnel Tungsteno 1000W / Aputure 300d + Spotlight',
        type: 'Luz dirigida dura/semi-dura',
        position: 'Lateral alto 45° con ángulo pronunciado',
        color_temp: '3200K Tungsteno cálido',
        intensity: 80,
        modifier: 'Cortadoras / Barn doors + Spot Lens',
      },
      fill_light: {
        name: 'Bandera negra (Negative Fill)',
        type: 'Relleno Negativo (Sin luz)',
        position: 'Lateral opuesto',
        color_temp: '-',
        intensity: 0,
        modifier: 'Floppy negro absorbe rebotes (Ratio 1:8)',
      },
      back_light: {
        name: 'Mini Fresnel / Dedo Light',
        type: 'Kicker fino en la mandíbula/hombro',
        position: 'Posterior 150° der',
        color_temp: '3200K',
        intensity: 45,
        modifier: 'Snood / Cortadoras finas',
      },
      background_light: {
        name: 'Haz rasante en pared texturada',
        type: 'Corte de luz rasante en fondo oscuro',
        position: 'Fondo lateral',
        color_temp: '3000K',
        intensity: 25,
      },
      diagram: {
        key_angle: 290,
        fill_angle: 70,
        back_angle: 150,
        subject_pos: { x: 50, y: 50 },
        camera_angle: 0,
      },
    },
  },
  {
    id: 'sys-preset-5',
    name: 'YouTube Creator / Talking Head Pro',
    description: 'Setup moderno optimizado para creadores de contenido, streaming de alta gama y cursos online.',
    category: 'youtube',
    is_system: true,
    camera_setup: {
      camera_model: 'Sony A7 IV / A7S III',
      sensor: 'Full Frame',
      lens: '24mm f/1.4 GM',
      aperture: 'f/1.8',
      focal_length: '24mm',
      fps: 30,
      shutter_speed: '1/60',
      iso: 640,
      color_profile: 'S-Cinetone / Rec.709',
      nd_filter: 'Variable ND 2-5 stops',
      aspect_ratio: '16:9',
    },
    lighting_setup: {
      scheme_name: 'Creator Studio Pro (Key + Edge RGB)',
      mood: 'Profesional moderno / Dinámico',
      key_light: {
        name: 'Amaran 200x S + Light Dome SE',
        type: 'Softbox octogonal frontal suave',
        position: 'Frontal ligeramente ladeada (25° der)',
        color_temp: '5000K Blanco limpio',
        intensity: 65,
        modifier: 'Difusor suave',
      },
      fill_light: {
        name: 'Rebote de escritorio / Panel tenue',
        type: 'Rebote pasivo',
        position: 'Frontal izq',
        color_temp: '5000K',
        intensity: 25,
        modifier: 'Rebote pasivo',
      },
      back_light: {
        name: 'Barra LED RGB Violeta / Azul Eléctrico',
        type: 'Hair / Shoulder Edge Light',
        position: 'Posterior 160° izq',
        color_temp: 'Azul / Violeta RGB',
        intensity: 55,
        modifier: 'Directo',
      },
      background_light: {
        name: 'Tira LED en estantería + Lámpara Edison cálida',
        type: 'Luces prácticas ambientales',
        position: 'Fondo escenográfico',
        color_temp: '2400K + RGB suave',
        intensity: 40,
      },
      diagram: {
        key_angle: 335,
        fill_angle: 25,
        back_angle: 160,
        subject_pos: { x: 50, y: 50 },
        camera_angle: 0,
      },
    },
  },
];

// GET /api/presets/camera-lighting — List all presets (system + user custom)
presetsRouter.get('/camera-lighting', async (req: AuthRequest, res) => {
  try {
    let customPresets: any[] = [];
    try {
      customPresets = await db.select().from(cameraLightingPresets).where(eq(cameraLightingPresets.user_id, req.userId!));
    } catch {
      // If table empty or error, fallback to empty list
    }

    res.json({
      data: [
        ...SYSTEM_PRESETS,
        ...customPresets.map((p: any) => ({ ...p, is_system: false })),
      ],
      error: null,
    });
  } catch (err) {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
  }
});

// POST /api/presets/camera-lighting — Save a new custom preset
presetsRouter.post('/camera-lighting', async (req: AuthRequest, res) => {
  try {
    const { name, description, category, camera_setup, lighting_setup } = req.body;
    if (!name || !camera_setup || !lighting_setup) {
      res.status(400).json({ data: null, error: { code: 'BAD_REQUEST', message: 'name, camera_setup y lighting_setup son requeridos' } });
      return;
    }

    const [preset] = await db.insert(cameraLightingPresets).values({
      id: uuidv4(),
      user_id: req.userId!,
      name,
      description: description || null,
      category: category || 'custom',
      camera_setup,
      lighting_setup,
      is_system: false,
    }).returning();

    res.status(201).json({ data: preset, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
  }
});

// DELETE /api/presets/camera-lighting/:id — Delete a custom preset
presetsRouter.delete('/camera-lighting/:id', async (req: AuthRequest, res) => {
  try {
    await db.delete(cameraLightingPresets).where(eq(cameraLightingPresets.id, req.params.id));
    res.json({ data: { deleted: true }, error: null });
  } catch (err) {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
  }
});
