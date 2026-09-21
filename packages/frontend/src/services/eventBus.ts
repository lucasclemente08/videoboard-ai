type EventCallback<T = any> = (data: T) => void;

class TypedEventBus {
  private listeners = new Map<string, Set<EventCallback>>();

  on<T>(event: string, callback: EventCallback<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => {
      this.off(event, callback);
    };
  }

  off<T>(event: string, callback: EventCallback<T>) {
    this.listeners.get(event)?.delete(callback);
  }

  emit<T>(event: string, data?: T) {
    this.listeners.get(event)?.forEach((cb) => {
      try {
        cb(data);
      } catch (err) {
        console.error(`Error in eventBus listener for ${event}:`, err);
      }
    });
  }
}

export const eventBus = new TypedEventBus();

export const AppEvents = {
  // Remote socket events -> local update
  REMOTE_SCENE_ADD: 'remote:scene:add',
  REMOTE_SCENE_UPDATE: 'remote:scene:update',
  REMOTE_SCENE_REMOVE: 'remote:scene:remove',
  REMOTE_CONNECTION_ADD: 'remote:connection:add',
  REMOTE_CONNECTION_REMOVE: 'remote:connection:remove',

  // Local mutations -> socket broadcast
  EMIT_SCENE_CREATED: 'emit:scene:created',
  EMIT_SCENE_UPDATE: 'emit:scene:update',
  EMIT_SCENE_DELETED: 'emit:scene:deleted',
  EMIT_CONNECTION_CREATED: 'emit:connection:created',
  EMIT_CONNECTION_DELETED: 'emit:connection:deleted',

  // Canvas commands
  ADD_CUSTOM_NODE: 'canvas:add_custom_node',
  SCENE_DROP: 'canvas:scene_drop',
} as const;

export const mediaDragState = {
  current: null as any,
};
