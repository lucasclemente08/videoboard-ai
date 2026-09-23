import { Router } from 'express';
import { db, eq, desc, asc } from '../config/database';
import { projects } from '../db/schema/projects';
import { scenes, sceneConnections } from '../db/schema/scenes';
import { shots } from '../db/schema/shots';
import { authMiddleware, type AuthRequest } from '../middleware/auth';
import { hasProjectAccess } from '../middleware/projectAccess';
import crypto from 'crypto';

export const templatesRouter = Router();

// Detailed Factory Templates with multiple pre-made scenes and shots
const FACTORY_TEMPLATES = [
  {
    id: 'tpl-commercial-30s',
    title: 'Spot Comercial de TV / Producto (30s)',
    description: 'Estructura publicitaria AIDA de alto impacto: gancho visual en 3s, frustración cotidiana, reveal heroico del producto, montaje de beneficios y packshot de conversión.',
    template_category: 'commercial',
    clone_count: 342,
    cover_url: 'https://images.unsplash.com/photo-1536240478700-b869070f9279?w=800&auto=format&fit=crop',
    scenes: [
      {
        title: '1. Visual Hook Hipnótico',
        objective: 'Captar atención inmediata en los primeros 3 segundos antes del skip',
        description: 'Macro extremo en cámara lenta con iluminación cinematográfica de alto contraste.',
        duration: 3,
        color: '#EF4444',
        tags: ['HOOK', 'MACRO', '120FPS'],
        scene_type: 'action',
        emotion: 'Curiosidad',
        shots: [
          {
            name: 'Plano 1 - Macro Detalle Gota de Agua',
            description: 'Lente 100mm Macro f/2.8. Gota de agua o condensación impactando la textura del producto a 120fps.',
            shot_type: 'macro',
            movement: 'static',
            lens: '100mm Macro',
            fps: 120,
            resolution: '3840x2160',
            duration: 1.5,
            camera_letter: 'A',
            camera_setup: { sensor: 'Full Frame', shutter: '1/240', iso: 800, wb: '5600K' },
            lighting_setup: { style: 'High Contrast Rim Light', key: 'Aputure 600d + Fresnel', rim: 'Nanlite Pavotube Cyan' },
          },
          {
            name: 'Plano 2 - Reacción de Asombro',
            description: 'Primer plano actor sorprendido mirando a cámara, fondo con bokeh cremoso.',
            shot_type: 'close_up',
            movement: 'dolly_in',
            lens: '50mm f/1.4',
            fps: 24,
            resolution: '3840x2160',
            duration: 1.5,
            camera_letter: 'B',
            camera_setup: { sensor: 'Full Frame', shutter: '1/50', iso: 400, wb: '5600K' },
            lighting_setup: { style: 'Soft Beauty Light', key: 'Aputure Light Dome III', fill: 'Reflector Blanco 50%' },
          },
        ],
      },
      {
        title: '2. Planteo del Problema Cotidiano',
        objective: 'Generar empatía inmediata con el dolor o frustración del espectador',
        description: 'Escenario de oficina o casa desordenada con iluminación fría y desaturada.',
        duration: 5,
        color: '#F97316',
        tags: ['PROBLEMA', 'DRAMA', 'INT'],
        scene_type: 'dialogue',
        emotion: 'Frustración',
        shots: [
          {
            name: 'Plano 1 - Caos en el Escritorio',
            description: 'Plano medio de la protagonista intentando trabajar mientras todo sale mal.',
            shot_type: 'medium',
            movement: 'handheld',
            lens: '35mm',
            fps: 24,
            resolution: '3840x2160',
            duration: 3,
            camera_letter: 'A',
            camera_setup: { sensor: 'Super 35', shutter: '1/50', iso: 640, wb: '4500K' },
            lighting_setup: { style: 'Cold Office Fluorescent', key: 'Kino Flo 4Bank', ambient: 'Tungsteno tenue' },
          },
          {
            name: 'Plano 2 - Inserto Cenital Taza Derramada',
            description: 'Plano cenital 90 grados (top-down) de papeles y café derramado sobre la mesa.',
            shot_type: 'insert',
            movement: 'static',
            lens: '24mm',
            fps: 60,
            resolution: '3840x2160',
            duration: 2,
            camera_letter: 'B',
            camera_setup: { sensor: 'Full Frame', shutter: '1/120', iso: 800, wb: '5000K' },
            lighting_setup: { style: 'Overhead Softbox', key: 'Grid 40x40 Soft' },
          },
        ],
      },
      {
        title: '3. El Punto de Inflexión / Descubrimiento',
        objective: 'Cambio radical de tono visual: de la frustración al alivio y esperanza',
        description: 'Entrada de un rayo de sol cálido (Golden Hour) que ilumina la caja del producto.',
        duration: 4,
        color: '#EAB308',
        tags: ['INFLEXIÓN', 'LUZ CÁLIDA', 'HERO'],
        scene_type: 'action',
        emotion: 'Alivio',
        shots: [
          {
            name: 'Plano 1 - Revelación con Gimbal Orbit',
            description: 'Movimiento circular alrededor del producto mientras la luz cambia de fría a dorada.',
            shot_type: 'medium_close_up',
            movement: 'gimbal_orbit',
            lens: '35mm anamórfico',
            fps: 24,
            resolution: '3840x2160',
            duration: 4,
            camera_letter: 'A',
            camera_setup: { sensor: 'Full Frame Anamorphic', shutter: '1/50', iso: 400, wb: '3200K Warm' },
            lighting_setup: { style: 'Golden Hour Flare', key: 'Aputure 1200d con Gel CTO Cálido' },
          },
        ],
      },
      {
        title: '4. Hero Product Shots & Macro Características',
        objective: 'Exhibir la calidad premium, materiales y detalles de diseño industrial',
        description: 'Tomas de estudio con mesa giratoria motorizada y reflejos especulares controlados.',
        duration: 8,
        color: '#10B981',
        tags: ['PRODUCTO', 'MACRO', 'STUDIO'],
        scene_type: 'montage',
        emotion: 'Deseo',
        shots: [
          {
            name: 'Plano 1 - Giro 360 del Producto',
            description: 'Plano entero del producto girando sobre fondo infinito oscuro con degradado tenue.',
            shot_type: 'medium',
            movement: 'dolly_in',
            lens: '50mm Prime',
            fps: 60,
            resolution: '3840x2160',
            duration: 3,
            camera_letter: 'A',
            camera_setup: { sensor: 'Full Frame', shutter: '1/120', iso: 200, wb: '5600K' },
            lighting_setup: { style: '3-Point Commercial Studio', key: 'Chimera Softbox', fill: 'Reflector Plata', rim: 'Tira LED perimetral' },
          },
          {
            name: 'Plano 2 - Macro Deslizante de Textura',
            description: 'Rack focus suave recorriendo el acabado de aluminio cepillado o cristal.',
            shot_type: 'macro',
            movement: 'slider_lateral',
            lens: '100mm Macro f/2.8',
            fps: 24,
            resolution: '3840x2160',
            duration: 2.5,
            camera_letter: 'B',
            camera_setup: { sensor: 'Full Frame', shutter: '1/50', iso: 400, wb: '5600K' },
            lighting_setup: { style: 'Specular Highlights', key: 'Fresnel Spot 15 grados enfocado' },
          },
          {
            name: 'Plano 3 - Activación de Feature Clave',
            description: 'El botón se presiona con respuesta táctil y una luz LED suave se enciende.',
            shot_type: 'extreme_close_up',
            movement: 'static',
            lens: '85mm',
            fps: 60,
            resolution: '3840x2160',
            duration: 2.5,
            camera_letter: 'A',
            camera_setup: { sensor: 'Super 35', shutter: '1/120', iso: 400, wb: '5600K' },
            lighting_setup: { style: 'Cyberpunk Subtle Accent', accent: 'Luz Neón Azul Cian de recorte' },
          },
        ],
      },
      {
        title: '5. Demostración en Uso & Estilo de Vida',
        objective: 'Demostrar facilidad, rapidez y felicidad en el uso del producto en la vida real',
        description: 'Montaje rítmico de 2 tomas con interacción humana natural y sonrisa sincera.',
        duration: 6,
        color: '#06B6D4',
        tags: ['DEMO', 'LIFESTYLE', 'SONRISA'],
        scene_type: 'action',
        emotion: 'Satisfacción',
        shots: [
          {
            name: 'Plano 1 - Uso Fluido en Acción',
            description: 'Plano medio de la protagonista usando el producto en su rutina sin esfuerzo ni fricción.',
            shot_type: 'medium',
            movement: 'tracking',
            lens: '35mm',
            fps: 24,
            resolution: '3840x2160',
            duration: 3,
            camera_letter: 'A',
            camera_setup: { sensor: 'Full Frame', shutter: '1/50', iso: 500, wb: '5600K' },
            lighting_setup: { style: 'Natural High-Key', key: 'Luz de ventana difusa + Rebote blanco' },
          },
          {
            name: 'Plano 2 - Mirada de Complacencia y Sonrisa',
            description: 'Primer plano de aprobación. Expresión de sorpresa relajada.',
            shot_type: 'close_up',
            movement: 'static',
            lens: '85mm f/1.8',
            fps: 24,
            resolution: '3840x2160',
            duration: 3,
            camera_letter: 'B',
            camera_setup: { sensor: 'Full Frame', shutter: '1/50', iso: 320, wb: '5600K' },
            lighting_setup: { style: 'Eye Light Reflector', key: 'Beauty Dish con tela difusora' },
          },
        ],
      },
      {
        title: '6. Call to Action (CTA) & Packshot Final',
        objective: 'Cierre publicitario: logotipo, llamado a la acción, oferta y web/redes',
        description: 'Composición limpia y simétrica con packshot oficial del producto y tipografía animada.',
        duration: 4,
        color: '#8B5CF6',
        tags: ['PACKSHOT', 'LOGO', 'CTA'],
        scene_type: 'dialogue',
        emotion: 'Confianza',
        shots: [
          {
            name: 'Plano 1 - Packshot Heroico de Marca',
            description: 'Plano frontal perfecto. El producto en el tercio derecho y el copy/precio a la izquierda.',
            shot_type: 'medium_close_up',
            movement: 'dolly_out_slow',
            lens: '50mm',
            fps: 24,
            resolution: '3840x2160',
            duration: 4,
            camera_letter: 'A',
            camera_setup: { sensor: 'Full Frame', shutter: '1/50', iso: 100, wb: '5600K' },
            lighting_setup: { style: 'Commercial Clean Studio', key: 'Overhead Softbox 4x4', fill: 'Doble panel LED difuso' },
          },
        ],
      },
    ],
  },
  {
    id: 'tpl-tiktok-viral-15s',
    title: 'TikTok & Reels Viral (15s Formato 9:16)',
    description: 'Estructura vertical 9:16 con cortes en el ritmo, retención en los primeros 2 segundos, subtítulos enérgicos y bucle infinito para maximizar el algoritmo.',
    template_category: 'tiktok',
    clone_count: 518,
    cover_url: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=800&auto=format&fit=crop',
    scenes: [
      {
        title: '1. Pattern Interrupt (Hook 2s)',
        objective: 'Detener el scroll del pulgar inmediatamente con gesto o frase disruptiva',
        description: 'Creador señalando la cámara con texto gigante en pantalla.',
        duration: 2,
        color: '#EF4444',
        tags: ['9:16', 'HOOK', 'JUMP-CUT'],
        scene_type: 'action',
        emotion: 'Impacto',
        shots: [
          {
            name: 'Plano 1 - Punch-In a Ojos',
            description: 'Zoom digital rápido hacia el rostro del creador. "Deja de cometer este error ya".',
            shot_type: 'close_up',
            movement: 'crash_zoom',
            lens: '24mm vertical',
            fps: 30,
            resolution: '1080x1920',
            duration: 1,
            camera_letter: 'A',
            camera_setup: { sensor: 'Smartphone / Mirrorless Vertical', iso: 400, wb: '5500K' },
            lighting_setup: { style: 'Ring Light Frontal + RGB de fondo' },
          },
          {
            name: 'Plano 2 - Gesto de Advertencia',
            description: 'Corte inmediato con cambio de ángulo sutil y subtítulo amarillo parpadeante.',
            shot_type: 'medium',
            movement: 'handheld',
            lens: '28mm vertical',
            fps: 30,
            resolution: '1080x1920',
            duration: 1,
            camera_letter: 'A',
            camera_setup: { sensor: 'Mirrorless Vertical', iso: 400, wb: '5500K' },
            lighting_setup: { style: 'Ring Light Frontal' },
          },
        ],
      },
      {
        title: '2. Planteamiento del Fallo Común',
        objective: 'Mostrar el error que el 95% de la audiencia comete sin saberlo',
        description: 'Demostración de la mala práctica en pantalla con sonido de error.',
        duration: 4,
        color: '#F59E0B',
        tags: ['9:16', 'ERROR', 'SCREENCAST'],
        scene_type: 'dialogue',
        emotion: 'Alerta',
        shots: [
          {
            name: 'Plano 1 - Grabación de Pantalla con Dedo Señalando',
            description: 'Over-the-shoulder mostrando la interfaz y el botón equivocado.',
            shot_type: 'insert',
            movement: 'static',
            lens: '35mm vertical',
            fps: 30,
            resolution: '1080x1920',
            duration: 2,
            camera_letter: 'B',
            camera_setup: { sensor: 'Vertical', iso: 400, wb: '5000K' },
            lighting_setup: { style: 'Desk Lamp Soft' },
          },
          {
            name: 'Plano 2 - Reacción "No hagas eso"',
            description: 'El creador niega con la cabeza y cruza los brazos.',
            shot_type: 'medium_close_up',
            movement: 'static',
            lens: '24mm vertical',
            fps: 30,
            resolution: '1080x1920',
            duration: 2,
            camera_letter: 'A',
            camera_setup: { sensor: 'Vertical', iso: 400, wb: '5500K' },
            lighting_setup: { style: 'Ring Light Frontal' },
          },
        ],
      },
      {
        title: '3. El "Hack" / Solución Revelada',
        objective: 'Compartir el paso exacto que resuelve el problema en 3 segundos',
        description: 'Acción rápida en vivo con efecto sonoro de satisfacción y texto en verde.',
        duration: 4,
        color: '#10B981',
        tags: ['9:16', 'HACK', 'SOLUCIÓN'],
        scene_type: 'action',
        emotion: 'Eureka',
        shots: [
          {
            name: 'Plano 1 - El Ajuste Secreto',
            description: 'Cámara en mano mostrando el ajuste exacto que cambia todo.',
            shot_type: 'close_up',
            movement: 'handheld_dynamic',
            lens: '24mm vertical',
            fps: 60,
            resolution: '1080x1920',
            duration: 2,
            camera_letter: 'A',
            camera_setup: { sensor: 'Vertical', iso: 400, wb: '5500K' },
            lighting_setup: { style: 'LED Panel Portátil' },
          },
          {
            name: 'Plano 2 - El Resultado Increíble',
            description: 'Plano medio mostrando el antes vs después en pantalla partida vertical.',
            shot_type: 'medium',
            movement: 'static',
            lens: '24mm vertical',
            fps: 30,
            resolution: '1080x1920',
            duration: 2,
            camera_letter: 'A',
            camera_setup: { sensor: 'Vertical', iso: 400, wb: '5500K' },
            lighting_setup: { style: 'Key Light + Teal Backlight' },
          },
        ],
      },
      {
        title: '4. El Giro / Elemento Viral',
        objective: 'Agregar un dato curioso o remate inesperado que incite comentarios',
        description: 'Cara de conspiración o complicidad mirando fijamente al objetivo.',
        duration: 3,
        color: '#8B5CF6',
        tags: ['9:16', 'VIRAL', 'ENGAGEMENT'],
        scene_type: 'dialogue',
        emotion: 'Complicidad',
        shots: [
          {
            name: 'Plano 1 - "Y lo mejor de todo es que..."',
            description: 'Inclinación de cuerpo hacia adelante hablando más bajo como un secreto.',
            shot_type: 'close_up',
            movement: 'dolly_in_fast',
            lens: '24mm vertical',
            fps: 30,
            resolution: '1080x1920',
            duration: 3,
            camera_letter: 'A',
            camera_setup: { sensor: 'Vertical', iso: 400, wb: '5500K' },
            lighting_setup: { style: 'Moody One-Side Key' },
          },
        ],
      },
      {
        title: '5. Loop Infinito & Llamado a Compartir',
        objective: 'Conectar la última frase con la primera para crear un bucle hipnótico sin fin',
        description: 'Gesto final de despedida que empalma fluidamente con el segundo cero.',
        duration: 2,
        color: '#EC4899',
        tags: ['9:16', 'LOOP', 'CTA'],
        scene_type: 'action',
        emotion: 'Satisfacción',
        shots: [
          {
            name: 'Plano 1 - Empalme de Bucle Infinito',
            description: '"Por eso mismo...", corte seco que enlaza con "deja de cometer este error ya".',
            shot_type: 'medium_close_up',
            movement: 'snap_cut',
            lens: '24mm vertical',
            fps: 30,
            resolution: '1080x1920',
            duration: 2,
            camera_letter: 'A',
            camera_setup: { sensor: 'Vertical', iso: 400, wb: '5500K' },
            lighting_setup: { style: 'Ring Light Frontal' },
          },
        ],
      },
    ],
  },
  {
    id: 'tpl-narrative-short',
    title: 'Cortometraje de Ficción / Puesta en Escena Cinemática',
    description: 'Estructura cinematográfica en 3 actos: establecimiento atmosférico, diálogo en campo/contracampo, tensión creciente, inserto simbólico y clímax dramático con lentes anamórficos.',
    template_category: 'narrative',
    clone_count: 289,
    cover_url: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800&auto=format&fit=crop',
    scenes: [
      {
        title: '1. Master Shot Atmosférico (INT. APARTAMENTO - NOCHE)',
        objective: 'Establecer el espacio escénico, la soledad del personaje y el tono lúgubre',
        description: 'Habitación tenuemente iluminada por la luz fría de la calle a través de las persianas con lluvia.',
        duration: 12,
        color: '#3B82F6',
        tags: ['MASTER', 'ATMÓSFERA', 'NOCHE'],
        scene_type: 'action',
        emotion: 'Melancolía',
        shots: [
          {
            name: 'Plano 1 - Gran Plano General Master',
            description: 'Lente 24mm Anamórfico 2.39:1. Perspectiva amplia del salón con humo flotando y sombras estiradas.',
            shot_type: 'wide',
            movement: 'slow_pan_right',
            lens: '24mm Anamorphic T2.0',
            fps: 24,
            resolution: '3840x1600 (2.39:1)',
            duration: 8,
            camera_letter: 'A',
            camera_setup: { sensor: 'Full Frame Anamorphic', shutter: '1/48 (180 deg)', iso: 1250, wb: '4300K' },
            lighting_setup: { style: 'Film Noir Moderno', key: 'Luz de luna a través de ventana con cortinas', ambient: 'Lámpara de pie halógena 5%' },
          },
          {
            name: 'Plano 2 - Inserto del Reloj de Pared',
            description: 'El péndulo oscila marcando las 3:17 AM. Sonido profundo de tic-tac.',
            shot_type: 'insert',
            movement: 'static',
            lens: '85mm Anamorphic',
            fps: 24,
            resolution: '3840x1600 (2.39:1)',
            duration: 4,
            camera_letter: 'B',
            camera_setup: { sensor: 'Full Frame Anamorphic', shutter: '1/48', iso: 800, wb: '4300K' },
            lighting_setup: { style: 'Luz puntual cenital tenue' },
          },
        ],
      },
      {
        title: '2. Presentación del Protagonista en Silueta',
        objective: 'Transmitir pesadumbre y carga emocional sin recurrir a diálogos explicativos',
        description: 'Personaje sentado junto a la mesa examinando una vieja fotografía.',
        duration: 10,
        color: '#6366F1',
        tags: ['PERSONAJE', 'SILUETA', 'REMBRANDT'],
        scene_type: 'dialogue',
        emotion: 'Introspección',
        shots: [
          {
            name: 'Plano 1 - Plano Medio con Iluminación Rembrandt',
            description: 'Triángulo de luz característico en la mejilla izquierda. El resto del rostro en penumbra.',
            shot_type: 'medium',
            movement: 'dolly_in_slow',
            lens: '50mm Anamorphic',
            fps: 24,
            resolution: '3840x1600 (2.39:1)',
            duration: 6,
            camera_letter: 'A',
            camera_setup: { sensor: 'Full Frame', shutter: '1/48', iso: 800, wb: '3200K' },
            lighting_setup: { style: 'Classic Rembrandt', key: 'Leko 750W con cortadoras a 45 grados', rim: 'Kino Flo tenue' },
          },
          {
            name: 'Plano 2 - Inserto Manos Temblorosas',
            description: 'Plano detalle de las manos sosteniendo la carta sellada que aún no se atreve a abrir.',
            shot_type: 'extreme_close_up',
            movement: 'static',
            lens: '100mm Macro',
            fps: 24,
            resolution: '3840x1600 (2.39:1)',
            duration: 4,
            camera_letter: 'B',
            camera_setup: { sensor: 'Full Frame', shutter: '1/48', iso: 800, wb: '3200K' },
            lighting_setup: { style: 'Luz cálida de velador de mesa' },
          },
        ],
      },
      {
        title: '3. El Golpe en la Puerta (Inciting Incident)',
        objective: 'Ruptura repentina del silencio y shock en el personaje',
        description: 'Tres golpes secos resuenan en la puerta de madera maciza.',
        duration: 8,
        color: '#F59E0B',
        tags: ['SUSPENSE', 'SONIDO', 'TENSION'],
        scene_type: 'action',
        emotion: 'Sobresalto',
        shots: [
          {
            name: 'Plano 1 - Primer Plano Ojos (Shock)',
            description: 'Primerísimo primer plano de los ojos del protagonista deteniéndose en seco.',
            shot_type: 'extreme_close_up',
            movement: 'rack_focus',
            lens: '85mm f/1.4',
            fps: 24,
            resolution: '3840x1600',
            duration: 4,
            camera_letter: 'A',
            camera_setup: { sensor: 'Full Frame', shutter: '1/48', iso: 1000, wb: '4300K' },
            lighting_setup: { style: 'Eye Light Intenso' },
          },
          {
            name: 'Plano 2 - Plano Contrapicado hacia la Puerta',
            description: 'Cámara a ras de suelo apuntando a la cerradura mientras la manija intenta girar.',
            shot_type: 'low_angle',
            movement: 'dolly_in',
            lens: '35mm',
            fps: 24,
            resolution: '3840x1600',
            duration: 4,
            camera_letter: 'B',
            camera_setup: { sensor: 'Full Frame', shutter: '1/48', iso: 1600, wb: '4300K' },
            lighting_setup: { style: 'Sombra proyectada bajo la rendija de la puerta' },
          },
        ],
      },
      {
        title: '4. Diálogo a Través de la Puerta (Campo / Contracampo)',
        objective: 'Tensión psicológica entre los dos personajes separados por la madera',
        description: 'Intercambio susurrado de dos réplicas con silencios cargados de significado.',
        duration: 14,
        color: '#8B5CF6',
        tags: ['DIÁLOGO', 'TENSION', 'CONTRASTE'],
        scene_type: 'dialogue',
        emotion: 'Peligro',
        shots: [
          {
            name: 'Plano 1 - Contraplano Protagonista Pegado a la Madera',
            description: 'Primer plano perfil. "¿Cómo me encontraste?". Respiración condensada.',
            shot_type: 'close_up',
            movement: 'handheld_subtle',
            lens: '50mm',
            fps: 24,
            resolution: '3840x1600',
            duration: 7,
            camera_letter: 'A',
            camera_setup: { sensor: 'Full Frame', shutter: '1/48', iso: 1250, wb: '3800K' },
            lighting_setup: { style: 'Split Lighting en rostro' },
          },
          {
            name: 'Plano 2 - La Silueta Exterior en el Visor',
            description: 'Plano subjetivo (POV) a través de la mirilla ojo de pez de la puerta.',
            shot_type: 'pov',
            movement: 'static',
            lens: '14mm Ultra Gran Angular',
            fps: 24,
            resolution: '3840x1600',
            duration: 7,
            camera_letter: 'B',
            camera_setup: { sensor: 'Ojo de pez distorsionado', iso: 2500, wb: '5000K' },
            lighting_setup: { style: 'Luz amarilla de pasillo exterior parpadeante' },
          },
        ],
      },
      {
        title: '5. La Decisión / Acción Inevitable',
        objective: 'El protagonista toma una determinación desesperada antes de abrir',
        description: 'Guarda la carta en su bolsillo interior y quita el cerrojo de seguridad.',
        duration: 10,
        color: '#10B981',
        tags: ['CLÍMAX', 'ACCIÓN', 'DECISIÓN'],
        scene_type: 'action',
        emotion: 'Resolución',
        shots: [
          {
            name: 'Plano 1 - Plano Detalle Llave y Pestillo',
            description: 'El sonido metálico del cerrojo abriéndose en cámara lenta.',
            shot_type: 'insert',
            movement: 'static',
            lens: '50mm Macro',
            fps: 48,
            resolution: '3840x1600',
            duration: 4,
            camera_letter: 'A',
            camera_setup: { sensor: 'Full Frame', shutter: '1/96', iso: 1000, wb: '4000K' },
            lighting_setup: { style: 'Luz rasante sobre el cerrojo' },
          },
          {
            name: 'Plano 2 - Rostro de Frente Antes de Abrir',
            description: 'Mirada fija hacia adelante. La puerta comienza a abrirse revelando luz blanca intensa.',
            shot_type: 'close_up',
            movement: 'dolly_in',
            lens: '35mm',
            fps: 24,
            resolution: '3840x1600',
            duration: 6,
            camera_letter: 'A',
            camera_setup: { sensor: 'Full Frame', shutter: '1/48', iso: 800, wb: '5600K' },
            lighting_setup: { style: 'Backlight masivo blanco inundando la escena' },
          },
        ],
      },
      {
        title: '6. Cliffhanger & Fundido a Negro',
        objective: 'Dejar al espectador sin aliento con una revelación en corte seco',
        description: 'La puerta se abre por completo. Reacción final de asombro.',
        duration: 6,
        color: '#1E293B',
        tags: ['CLIFFHANGER', 'FIN', 'FADE'],
        scene_type: 'action',
        emotion: 'Misterio',
        shots: [
          {
            name: 'Plano 1 - Encuadre desde Espalda al Umbral',
            description: 'La silueta del visitante de pie bajo la lluvia en el rellano. Corte seco a negro.',
            shot_type: 'over_the_shoulder',
            movement: 'static',
            lens: '28mm Anamorphic',
            fps: 24,
            resolution: '3840x1600',
            duration: 6,
            camera_letter: 'A',
            camera_setup: { sensor: 'Full Frame Anamorphic', shutter: '1/48', iso: 1600, wb: '5600K' },
            lighting_setup: { style: 'Contraluz total en siluetas' },
          },
        ],
      },
    ],
  },
  {
    id: 'tpl-youtube-creator',
    title: 'YouTube Creator (Talking Head + B-Roll Overlays)',
    description: 'Estructura moderna para creadores y educadores de video: Cold Open con gancho irresistible, presentación de conceptos con cámara B, B-roll en cámara lenta y tarjetas de cierre para retención máxima.',
    template_category: 'youtube',
    clone_count: 412,
    cover_url: 'https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?w=800&auto=format&fit=crop',
    scenes: [
      {
        title: '1. Cold Open / Hook Hipnótico (15s)',
        objective: 'Captar a la audiencia en los primeros 15 segundos con promesa de alto valor',
        description: 'Plano medio con punch-ins digitales y música de bajo envolvente.',
        duration: 15,
        color: '#EF4444',
        tags: ['HOOK', 'PUNCH-IN', 'CAM-A'],
        scene_type: 'dialogue',
        emotion: 'Curiosidad',
        shots: [
          {
            name: 'Plano 1 - Punch In Frontal de Cámara A',
            description: '35mm f/1.8 en 4K. Creador directo a cámara: "Si sigues haciendo esto en 2026, estás perdiendo el 80% de tus clientes".',
            shot_type: 'medium',
            movement: 'digital_punch_in',
            lens: '35mm Prime',
            fps: 24,
            resolution: '3840x2160',
            duration: 5,
            camera_letter: 'A',
            camera_setup: { sensor: 'Full Frame', shutter: '1/50', iso: 400, wb: '5600K' },
            lighting_setup: { style: 'YouTube Studio Pro', key: 'Aputure 300d + Lantern', rim: 'Tira LED azul', fill: 'Reflector plegable' },
          },
          {
            name: 'Plano 2 - B-Roll Rápido de Caso Real',
            description: 'Tomas de alta velocidad mostrando gráficas de facturación o el producto en acción.',
            shot_type: 'insert',
            movement: 'slider',
            lens: '50mm',
            fps: 60,
            resolution: '3840x2160',
            duration: 5,
            camera_letter: 'B',
            camera_setup: { sensor: 'Full Frame', shutter: '1/120', iso: 400, wb: '5600K' },
            lighting_setup: { style: 'Desk Workspace Clean' },
          },
          {
            name: 'Plano 3 - Planteo de la Promesa',
            description: '"Hoy te voy a revelar el método de 3 pasos que nadie te cuenta".',
            shot_type: 'medium_close_up',
            movement: 'static',
            lens: '35mm',
            fps: 24,
            resolution: '3840x2160',
            duration: 5,
            camera_letter: 'A',
            camera_setup: { sensor: 'Full Frame', shutter: '1/50', iso: 400, wb: '5600K' },
            lighting_setup: { style: 'YouTube Studio Pro' },
          },
        ],
      },
      {
        title: '2. Intro de Canal & Identidad de Marca (5s)',
        objective: 'Branding rápido sin perder retención de audiencia',
        description: 'Sting sonoro con tipografía animada limpia de 5 segundos.',
        duration: 5,
        color: '#6366F1',
        tags: ['BRANDING', 'VFX', 'AUDIO'],
        scene_type: 'montage',
        emotion: 'Energía',
        shots: [
          {
            name: 'Plano 1 - Logo Sting Cinematográfico',
            description: 'Animación de logotipo minimalista con subgrave y sonido de impacto.',
            shot_type: 'wide',
            movement: 'static',
            lens: 'Gráfico Digital',
            fps: 60,
            resolution: '3840x2160',
            duration: 5,
            camera_letter: 'VFX',
          },
        ],
      },
      {
        title: '3. Paso 1: El Error de Base (Cámara A + B)',
        objective: 'Desmenuzar el primer punto clave alternando entre cámara frontal y lateral',
        description: 'Explicación didáctica con gráficos superpuestos en el tercio lateral.',
        duration: 30,
        color: '#F59E0B',
        tags: ['MULTI-CAM', 'EDUCACIÓN', 'GRÁFICO'],
        scene_type: 'dialogue',
        emotion: 'Aprendizaje',
        shots: [
          {
            name: 'Plano 1 - Cámara A Frontal con Gráfico Flotante',
            description: 'Desarrollo de la idea con esquema animado a la derecha del presentador.',
            shot_type: 'medium',
            movement: 'static',
            lens: '35mm',
            fps: 24,
            resolution: '3840x2160',
            duration: 18,
            camera_letter: 'A',
            camera_setup: { sensor: 'Full Frame', shutter: '1/50', iso: 400, wb: '5600K' },
            lighting_setup: { style: 'YouTube Studio Pro' },
          },
          {
            name: 'Plano 2 - Cámara B Lateral (Ángulo 45 Grados)',
            description: 'Cambio de ritmo a plano más cercano e íntimo para enfatizar un consejo clave.',
            shot_type: 'close_up',
            movement: 'static',
            lens: '85mm f/1.8',
            fps: 24,
            resolution: '3840x2160',
            duration: 12,
            camera_letter: 'B',
            camera_setup: { sensor: 'Full Frame', shutter: '1/50', iso: 400, wb: '5600K' },
            lighting_setup: { style: 'Cámara B Perfil con rim light dorado' },
          },
        ],
      },
      {
        title: '4. Paso 2: Demostración en Pantalla con B-Roll',
        objective: 'Mostrar el paso a paso práctico en el software con teclado y manos',
        description: 'Overlays de pantalla completa intercalados con macro de teclado mecánico.',
        duration: 35,
        color: '#10B981',
        tags: ['DEMO', 'SCREENCAST', 'MACRO'],
        scene_type: 'action',
        emotion: 'Claridad',
        shots: [
          {
            name: 'Plano 1 - Screencast Grabación de Pantalla 4K',
            description: 'Captura directa del flujo de trabajo con cursor resaltado.',
            shot_type: 'screen',
            movement: 'static',
            lens: 'Directo HDMI 4K',
            fps: 60,
            resolution: '3840x2160',
            duration: 20,
            camera_letter: 'Screen',
          },
          {
            name: 'Plano 2 - Macro Manos en Teclado y Ratón',
            description: 'Plano detalle a 60fps con poca profundidad de campo y sonido ASMR.',
            shot_type: 'macro',
            movement: 'slider_lateral',
            lens: '100mm Macro',
            fps: 60,
            resolution: '3840x2160',
            duration: 15,
            camera_letter: 'B',
            camera_setup: { sensor: 'Full Frame', shutter: '1/120', iso: 640, wb: '5600K' },
            lighting_setup: { style: 'Desk Spotlight' },
          },
        ],
      },
      {
        title: '5. Paso 3: El Secreto Avanzado (Pro Tip)',
        objective: 'Aportar la joya de valor que fideliza al suscriptor y genera comentarios',
        description: 'Tono confidencial y enérgico, cámara frontal fija con mirada penetrante.',
        duration: 25,
        color: '#8B5CF6',
        tags: ['PRO-TIP', 'VALOR', 'RETENCIÓN'],
        scene_type: 'dialogue',
        emotion: 'Empoderamiento',
        shots: [
          {
            name: 'Plano 1 - Primer Plano Enfático',
            description: 'Explicación del truco final que nadie más está aplicando.',
            shot_type: 'close_up',
            movement: 'static',
            lens: '50mm',
            fps: 24,
            resolution: '3840x2160',
            duration: 25,
            camera_letter: 'A',
            camera_setup: { sensor: 'Full Frame', shutter: '1/50', iso: 400, wb: '5600K' },
            lighting_setup: { style: 'YouTube Studio Pro' },
          },
        ],
      },
      {
        title: '6. Cierre, Call to Action & Pantalla Final',
        objective: 'Convertir al espectador en suscriptor y redirigir al siguiente video del canal',
        description: 'Plantilla de pantalla final con espacios designados para tarjeta de suscripción y video recomendado.',
        duration: 15,
        color: '#EC4899',
        tags: ['OUTRO', 'END-SCREEN', 'SUSCRIPCIÓN'],
        scene_type: 'dialogue',
        emotion: 'Motivación',
        shots: [
          {
            name: 'Plano 1 - Despedida con Espacios de End Screen',
            description: 'El presentador se despide mientras señala las dos cajas de video flotantes en pantalla.',
            shot_type: 'medium',
            movement: 'static',
            lens: '35mm',
            fps: 24,
            resolution: '3840x2160',
            duration: 15,
            camera_letter: 'A',
            camera_setup: { sensor: 'Full Frame', shutter: '1/50', iso: 400, wb: '5600K' },
            lighting_setup: { style: 'YouTube Studio Pro' },
          },
        ],
      },
    ],
  },
  {
    id: 'tpl-music-video',
    title: 'Videoclip Musical / Rítmico (Performance + Moodboard)',
    description: 'Guion técnico musical sincronizado con el compás de la canción: performance vocal enérgica, narrativa urbana paralela, lentes anamórficos e iluminación neón estilizada.',
    template_category: 'music_video',
    clone_count: 247,
    cover_url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop',
    scenes: [
      {
        title: '1. Intro Atmosférica / Beat Inicial',
        objective: 'Establecer la vibra y paleta de color antes de la entrada del bajo',
        description: 'Niebla pesada, sombras largas y luces estroboscópicas tenues al compás del bombo.',
        duration: 15,
        color: '#06B6D4',
        tags: ['NEÓN', 'SLOW-MO', 'INTRO'],
        scene_type: 'action',
        emotion: 'Misterio',
        shots: [
          {
            name: 'Plano 1 - Silueta en Niebla Volumétrica',
            description: 'Lente 24mm Anamórfico. Contraluz azul cian penetrando a través de la máquina de humo.',
            shot_type: 'wide',
            movement: 'slow_dolly_in',
            lens: '24mm Anamorphic',
            fps: 60,
            resolution: '3840x1600',
            duration: 8,
            camera_letter: 'A',
            camera_setup: { sensor: 'Full Frame', shutter: '1/120', iso: 1600, wb: '4500K' },
            lighting_setup: { style: 'Cyberpunk Backlit', key: 'Astera Titan Tubes en modo degradado cian/magenta' },
          },
          {
            name: 'Plano 2 - Macro Detalle Micrófono Vintage',
            description: 'Plano detalle del micrófono Shure 55SH con reflejos metálicos pulidos.',
            shot_type: 'macro',
            movement: 'static',
            lens: '100mm Macro',
            fps: 120,
            resolution: '3840x1600',
            duration: 7,
            camera_letter: 'B',
            camera_setup: { sensor: 'Full Frame', shutter: '1/240', iso: 800, wb: '4500K' },
            lighting_setup: { style: 'Rim Light Especular' },
          },
        ],
      },
      {
        title: '2. Verso 1: Narrativa Urbana en Solitario',
        objective: 'Presentar la historia conceptual de los personajes por la ciudad',
        description: 'Traveling lateral en coche con reflejos de faros y asfalto mojado.',
        duration: 25,
        color: '#3B82F6',
        tags: ['URBANO', 'TRAVELING', 'NOCHE'],
        scene_type: 'action',
        emotion: 'Nostalgia',
        shots: [
          {
            name: 'Plano 1 - Traveling en Auto con Reflejos en Cristal',
            description: 'Cámara montada en rig de ventanilla exterior. Luces de la ciudad pasando a gran velocidad.',
            shot_type: 'medium',
            movement: 'car_mount',
            lens: '35mm Anamorphic',
            fps: 24,
            resolution: '3840x1600',
            duration: 15,
            camera_letter: 'A',
            camera_setup: { sensor: 'Full Frame', shutter: '1/48', iso: 2000, wb: '3800K' },
            lighting_setup: { style: 'Ambient Street Lights + Tubo LED interior difuso' },
          },
          {
            name: 'Plano 2 - Snorricam Frontal Caminando',
            description: 'Cámara fijada al arnés del actor apuntando a su pecho mientras el fondo se deforma.',
            shot_type: 'snorricam',
            movement: 'snorricam_attached',
            lens: '18mm Ultra Wide',
            fps: 24,
            resolution: '3840x1600',
            duration: 10,
            camera_letter: 'B',
            camera_setup: { sensor: 'Super 35', shutter: '1/48', iso: 1250, wb: '4000K' },
            lighting_setup: { style: 'LED montado en rig snorricam' },
          },
        ],
      },
      {
        title: '3. Coro 1: Explosión de Performance Vocal',
        objective: 'Liberar toda la energía del estribillo con movimientos rápidos de cámara',
        description: 'Artista cantando a pleno pulmón con cámara en mano agresiva y luces sincronizadas con DMX.',
        duration: 30,
        color: '#EF4444',
        tags: ['PERFORMANCE', 'CORO', 'ENERGÍA'],
        scene_type: 'action',
        emotion: 'Éxtasis',
        shots: [
          {
            name: 'Plano 1 - Playback Frontal Dinámico',
            description: 'Lente gran angular 24mm muy cerca del artista. Movimiento circular enérgico.',
            shot_type: 'medium_close_up',
            movement: 'handheld_whip',
            lens: '24mm Prime T1.5',
            fps: 48,
            resolution: '3840x1600',
            duration: 15,
            camera_letter: 'A',
            camera_setup: { sensor: 'Full Frame', shutter: '1/96', iso: 800, wb: '5000K' },
            lighting_setup: { style: 'DMX Strobe Chases', key: 'Arri Skypanel S60 pulsando en rojo/blanco' },
          },
          {
            name: 'Plano 2 - Contrapicado Heroico en el Escenario',
            description: 'Ángulo bajo apuntando hacia arriba con bengalas o chispas frías de fondo.',
            shot_type: 'low_angle',
            movement: 'dolly_in_fast',
            lens: '35mm',
            fps: 24,
            resolution: '3840x1600',
            duration: 15,
            camera_letter: 'B',
            camera_setup: { sensor: 'Full Frame', shutter: '1/48', iso: 800, wb: '5000K' },
            lighting_setup: { style: 'Concert Stage Lighting' },
          },
        ],
      },
      {
        title: '4. Verso 2: Encuentro de Personajes',
        objective: 'Desarrollar el conflicto romántico o de amistad en la historia paralela',
        description: 'Bar subterráneo íntimo con humo y lente 85mm con bokeh cremoso.',
        duration: 30,
        color: '#F59E0B',
        tags: ['NARRATIVA', 'BAR', 'BOKEH'],
        scene_type: 'dialogue',
        emotion: 'Atracción',
        shots: [
          {
            name: 'Plano 1 - Steadicam Navegando entre la Multitud',
            description: 'Plano secuencia siguiendo a la coprotagonista hasta llegar a la barra.',
            shot_type: 'steadicam',
            movement: 'tracking_continuous',
            lens: '28mm',
            fps: 24,
            resolution: '3840x1600',
            duration: 18,
            camera_letter: 'A',
            camera_setup: { sensor: 'Full Frame', shutter: '1/48', iso: 1600, wb: '3200K Warm' },
            lighting_setup: { style: 'Warm Tungsten Club Mood' },
          },
          {
            name: 'Plano 2 - Cruce de Miradas Intenso',
            description: 'Plano y contraplano con desenfoque extremo de primer término.',
            shot_type: 'close_up',
            movement: 'static',
            lens: '85mm f/1.4',
            fps: 24,
            resolution: '3840x1600',
            duration: 12,
            camera_letter: 'B',
            camera_setup: { sensor: 'Full Frame', shutter: '1/48', iso: 1000, wb: '3200K' },
            lighting_setup: { style: 'Spotlight Suave en Ojos' },
          },
        ],
      },
      {
        title: '5. Puente / Solo Instrumental en Cámara Lenta (120fps)',
        objective: 'Pausa dramática que crea anticipación antes del clímax final',
        description: 'Cámara ultra lenta a 120fps con agua cayendo del cielo o polvo flotante.',
        duration: 25,
        color: '#8B5CF6',
        tags: ['SLOW-MO', '120FPS', 'PUENTE'],
        scene_type: 'action',
        emotion: 'Trascendencia',
        shots: [
          {
            name: 'Plano 1 - Solo de Guitarra / Grito en la Lluvia',
            description: '120fps en 4K. Gotas de agua suspendidas en el aire alrededor del artista.',
            shot_type: 'medium',
            movement: 'slow_pan',
            lens: '50mm Prime',
            fps: 120,
            resolution: '3840x1600',
            duration: 15,
            camera_letter: 'A',
            camera_setup: { sensor: 'Full Frame', shutter: '1/240', iso: 1250, wb: '4800K' },
            lighting_setup: { style: 'Backlit Water Rain Rig', key: 'Aputure 1200d detrás de la lluvia' },
          },
          {
            name: 'Plano 2 - Cenital Giratorio 360',
            description: 'Cámara cenital sobre una grúa o polea girando lentamente sobre el cantante tumbado en el suelo.',
            shot_type: 'overhead_bird_eye',
            movement: 'overhead_spin',
            lens: '24mm',
            fps: 60,
            resolution: '3840x1600',
            duration: 10,
            camera_letter: 'B',
            camera_setup: { sensor: 'Full Frame', shutter: '1/120', iso: 800, wb: '4800K' },
            lighting_setup: { style: 'Círculo de luz cenital' },
          },
        ],
      },
      {
        title: '6. Clímax Final & Desvanecimiento (Outro)',
        objective: 'Convergencia de la historia y la música en una resolución visual apoteósica',
        description: 'Luces apagándose gradualmente hasta dejar un único foco blanco y corte.',
        duration: 20,
        color: '#10B981',
        tags: ['CLÍMAX', 'OUTRO', 'FADE'],
        scene_type: 'action',
        emotion: 'Catarsis',
        shots: [
          {
            name: 'Plano 1 - Montaje Rápido de Destellos',
            description: 'Cortes rápidos al compás de cada golpe de bombo uniendo performance y narrativa.',
            shot_type: 'montage',
            movement: 'rapid_whips',
            lens: '35mm',
            fps: 24,
            resolution: '3840x1600',
            duration: 12,
            camera_letter: 'A',
            camera_setup: { sensor: 'Full Frame', shutter: '1/48', iso: 800, wb: '5000K' },
            lighting_setup: { style: 'Luces estroboscópicas DMX' },
          },
          {
            name: 'Plano 2 - Cuadro Final en Silueta y Apagado',
            description: 'El artista baja el micrófono. La luz cenital se apaga. Silencio absoluto.',
            shot_type: 'wide',
            movement: 'static',
            lens: '35mm Anamorphic',
            fps: 24,
            resolution: '3840x1600',
            duration: 8,
            camera_letter: 'A',
            camera_setup: { sensor: 'Full Frame Anamorphic', shutter: '1/48', iso: 400, wb: '4000K' },
            lighting_setup: { style: 'Single Spotlight Fade to Black' },
          },
        ],
      },
    ],
  },
];

// Helper to seed or update factory templates with all pre-made scenes and shots
export async function ensureFactoryTemplates() {
  for (const tpl of FACTORY_TEMPLATES) {
    try {
      const existing = await db.select().from(projects).where(eq(projects.id, tpl.id));
      let shouldSeedScenes = false;

      if (existing.length === 0) {
        await db.insert(projects).values({
          id: tpl.id,
          title: tpl.title,
          description: tpl.description,
          cover_url: tpl.cover_url,
          status: 'ready',
          is_template: true,
          template_category: tpl.template_category,
          clone_count: tpl.clone_count,
        });
        shouldSeedScenes = true;
      } else {
        // Check if existing template has the new complete scenes
        const existingScenes = await db.select().from(scenes).where(eq(scenes.project_id, tpl.id));
        if (existingScenes.length < tpl.scenes.length) {
          // Update project metadata and replace scenes with complete pre-made set
          await db.delete(scenes).where(eq(scenes.project_id, tpl.id));
          await db.delete(sceneConnections).where(eq(sceneConnections.project_id, tpl.id));
          await db
            .update(projects)
            .set({
              title: tpl.title,
              description: tpl.description,
              cover_url: tpl.cover_url,
              template_category: tpl.template_category,
              updated_at: new Date(),
            })
            .where(eq(projects.id, tpl.id));
          shouldSeedScenes = true;
        }
      }

      if (shouldSeedScenes) {
        const createdSceneIds: string[] = [];

        // Insert each pre-made scene positioned cleanly on the canvas
        for (let i = 0; i < tpl.scenes.length; i++) {
          const sc = tpl.scenes[i];
          const newSceneId = crypto.randomUUID();
          createdSceneIds.push(newSceneId);

          const [createdScene] = await db
            .insert(scenes)
            .values({
              id: newSceneId,
              project_id: tpl.id,
              title: sc.title,
              objective: sc.objective,
              description: sc.description,
              estimated_duration_secs: sc.duration,
              color: sc.color,
              tags: sc.tags,
              scene_type: sc.scene_type,
              emotion: sc.emotion,
              position_x: i * 360 + 50,
              position_y: 120,
              width: 320,
              height: 220,
              sort_order: i,
            })
            .returning();

          // Insert all pre-made shots for this scene
          for (let j = 0; j < sc.shots.length; j++) {
            const sh = sc.shots[j];
            await db.insert(shots).values({
              scene_id: createdScene.id,
              name: sh.name,
              description: sh.description,
              shot_type: sh.shot_type,
              movement: sh.movement,
              lens: sh.lens,
              fps: sh.fps,
              resolution: sh.resolution,
              estimated_duration_secs: Math.round(sh.duration),
              camera_letter: sh.camera_letter,
              camera_setup: sh.camera_setup || null,
              lighting_setup: sh.lighting_setup || null,
              sort_order: j,
            });
          }
        }

        // Create sequential scene connections (Scene 1 -> Scene 2 -> ...)
        for (let i = 0; i < createdSceneIds.length - 1; i++) {
          await db.insert(sceneConnections).values({
            id: crypto.randomUUID(),
            project_id: tpl.id,
            source_scene_id: createdSceneIds[i],
            target_scene_id: createdSceneIds[i + 1],
            connection_type: 'sequence',
            transition_type: 'cut',
          });
        }
      }
    } catch (e) {
      console.error('Error seeding template:', tpl.id, e);
    }
  }
}

// 1. GET /api/templates — Public endpoint to list community templates with rich scenes
templatesRouter.get('/', async (req, res) => {
  try {
    await ensureFactoryTemplates();

    const templateRows = await db
      .select()
      .from(projects)
      .where(eq(projects.is_template, true))
      .orderBy(desc(projects.clone_count));

    // Attach all scenes count, shot count and detailed scenes preview
    const result = [];
    for (const tpl of templateRows) {
      const tplScenes = await db
        .select()
        .from(scenes)
        .where(eq(scenes.project_id, tpl.id))
        .orderBy(asc(scenes.sort_order));

      let totalShots = 0;
      const scenesWithShots = [];

      for (const sc of tplScenes) {
        const scShots = await db
          .select()
          .from(shots)
          .where(eq(shots.scene_id, sc.id))
          .orderBy(asc(shots.sort_order));

        totalShots += scShots.length;
        scenesWithShots.push({
          id: sc.id,
          title: sc.title,
          objective: sc.objective,
          description: sc.description,
          duration: sc.estimated_duration_secs,
          color: sc.color,
          tags: sc.tags,
          shot_count: scShots.length,
          shots: scShots.map((sh) => ({
            id: sh.id,
            name: sh.name,
            shot_type: sh.shot_type,
            lens: sh.lens,
            movement: sh.movement,
            duration: sh.estimated_duration_secs,
          })),
        });
      }

      result.push({
        ...tpl,
        scene_count: tplScenes.length,
        shot_count: totalShots,
        total_duration_secs: tplScenes.reduce((acc, s) => acc + (s.estimated_duration_secs || 5), 0),
        preview_scenes: scenesWithShots,
      });
    }

    res.json({ data: result, error: null });
  } catch (err: any) {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

// 1.1 GET /api/templates/:id/details — Full breakdown of a single template
templatesRouter.get('/:id/details', async (req, res) => {
  try {
    const templateId = req.params.id;
    const tplRows = await db.select().from(projects).where(eq(projects.id, templateId));
    if (tplRows.length === 0) {
      res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Plantilla no encontrada' } });
      return;
    }

    const tpl = tplRows[0];
    const tplScenes = await db
      .select()
      .from(scenes)
      .where(eq(scenes.project_id, templateId))
      .orderBy(asc(scenes.sort_order));

    const fullScenes = [];
    for (const sc of tplScenes) {
      const scShots = await db
        .select()
        .from(shots)
        .where(eq(shots.scene_id, sc.id))
        .orderBy(asc(shots.sort_order));

      fullScenes.push({
        ...sc,
        shots: scShots,
      });
    }

    res.json({
      data: {
        ...tpl,
        scenes: fullScenes,
      },
      error: null,
    });
  } catch (err: any) {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});

// 2. POST /api/templates/:id/clone — Clone a template to user's account with all scenes & shots
templatesRouter.post('/:id/clone', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const templateId = req.params.id;
    const tplRows = await db.select().from(projects).where(eq(projects.id, templateId));
    if (tplRows.length === 0) {
      res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Plantilla no encontrada' } });
      return;
    }

    const tpl = tplRows[0];

    // Security: Only allow cloning if the project is marked as a template or the user has access to it
    if (!tpl.is_template) {
      const hasAccess = await hasProjectAccess(templateId, req.userId);
      if (!hasAccess) {
        res.status(403).json({ data: null, error: { code: 'FORBIDDEN', message: 'No tienes permiso para clonar este proyecto privado' } });
        return;
      }
    }

    // Create cloned project under user's ownership
    const newProjectId = crypto.randomUUID();
    const [newProject] = await db
      .insert(projects)
      .values({
        id: newProjectId,
        title: req.body.title || `${tpl.title} (Mi Proyecto)`,
        description: tpl.description,
        cover_url: tpl.cover_url,
        status: 'draft',
        owner_id: req.userId!,
        is_template: false,
        clone_count: 0,
      })
      .returning();

    // Increment clone count on original template
    await db
      .update(projects)
      .set({ clone_count: (tpl.clone_count || 0) + 1 })
      .where(eq(projects.id, templateId));

    // Clone all scenes and shots with mapped UUIDs
    const tplScenes = await db.select().from(scenes).where(eq(scenes.project_id, templateId));
    const sceneIdMap = new Map<string, string>();

    for (const sc of tplScenes) {
      const newSceneId = crypto.randomUUID();
      sceneIdMap.set(sc.id, newSceneId);

      await db.insert(scenes).values({
        id: newSceneId,
        project_id: newProjectId,
        title: sc.title,
        description: sc.description,
        objective: sc.objective,
        color: sc.color,
        tags: sc.tags,
        scene_type: sc.scene_type,
        emotion: sc.emotion,
        estimated_duration_secs: sc.estimated_duration_secs,
        position_x: sc.position_x,
        position_y: sc.position_y,
        width: sc.width,
        height: sc.height,
        sort_order: sc.sort_order,
      });

      // Clone shots for this scene
      const scShots = await db.select().from(shots).where(eq(shots.scene_id, sc.id));
      for (const sh of scShots) {
        await db.insert(shots).values({
          scene_id: newSceneId,
          name: sh.name,
          description: sh.description,
          shot_type: sh.shot_type,
          movement: sh.movement,
          lens: sh.lens,
          fps: sh.fps,
          resolution: sh.resolution,
          estimated_duration_secs: sh.estimated_duration_secs,
          priority: sh.priority,
          status: 'planned',
          camera_letter: sh.camera_letter,
          camera_setup: sh.camera_setup,
          lighting_setup: sh.lighting_setup,
          sort_order: sh.sort_order,
        });
      }
    }

    // Clone connections
    const tplConns = await db.select().from(sceneConnections).where(eq(sceneConnections.project_id, templateId));
    for (const cn of tplConns) {
      const newSrc = sceneIdMap.get(cn.source_scene_id);
      const newTgt = sceneIdMap.get(cn.target_scene_id);
      if (newSrc && newTgt) {
        await db.insert(sceneConnections).values({
          id: crypto.randomUUID(),
          project_id: newProjectId,
          source_scene_id: newSrc,
          target_scene_id: newTgt,
          connection_type: cn.connection_type,
          label: cn.label,
          transition_type: cn.transition_type,
        });
      }
    }

    res.status(201).json({ data: newProject, error: null });
  } catch (err: any) {
    res.status(500).json({ data: null, error: { code: 'CLONE_ERROR', message: err.message } });
  }
});

// 3. POST /api/templates/publish/:projectId — Publish a project as a community template
templatesRouter.post('/publish/:projectId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const projectId = req.params.projectId;
    const hasAccess = await hasProjectAccess(projectId, req.userId);
    if (!hasAccess) {
      res.status(403).json({ data: null, error: { code: 'FORBIDDEN', message: 'No tienes permiso para publicar este proyecto' } });
      return;
    }

    const { category = 'commercial', description } = req.body;

    const [updated] = await db
      .update(projects)
      .set({
        is_template: true,
        template_category: category,
        description: description || undefined,
        updated_at: new Date(),
      })
      .where(eq(projects.id, projectId))
      .returning();

    res.json({
      data: {
        templateId: updated.id,
        title: updated.title,
        category: updated.template_category,
        message: '¡Proyecto publicado exitosamente en la comunidad como plantilla!',
      },
      error: null,
    });
  } catch (err: any) {
    res.status(500).json({ data: null, error: { code: 'INTERNAL_ERROR', message: err.message } });
  }
});
