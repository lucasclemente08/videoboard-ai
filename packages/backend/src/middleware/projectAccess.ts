import { db, eq } from '../config/database';
import { projects, projectMembers } from '../db/schema/projects';
import { ensureFactoryTemplates } from '../routes/templates';

/**
 * Checks if the specified user has authorization to access, modify, or export the project.
 * Allows access if:
 * 1. Project is a factory template.
 * 2. Project has no owner (legacy/demo seeds).
 * 3. User is the project owner.
 * 4. User is an assigned member in project_members.
 * 5. In development environment, never blocks access.
 */
export async function hasProjectAccess(projectId: string, userId?: string): Promise<boolean> {
  if (!projectId) return false;

  try {
    // 1. If it's a factory template ID, seed it and allow access immediately
    if (projectId.startsWith('tpl-')) {
      await ensureFactoryTemplates();
      return true;
    }

    let rows = await db.select().from(projects).where(eq(projects.id, projectId));
    if (rows.length === 0) {
      await ensureFactoryTemplates();
      rows = await db.select().from(projects).where(eq(projects.id, projectId));
      if (rows.length === 0) {
        // In local development or memory database, grant access so the user is never blocked
        if (process.env.NODE_ENV !== 'production') return true;
        return false;
      }
    }

    const project = rows[0] as any;

    // 2. If project has no owner (legacy/demo seeds/templates)
    if (!project.owner_id) return true;

    // 3. If project is marked as template, allow access
    if (project.is_template) return true;

    // 4. In development environment, grant access so local testing/editing is never blocked
    if (process.env.NODE_ENV !== 'production') return true;

    if (!userId) return false;

    // 5. If user is the project owner
    if (project.owner_id === userId) return true;

    // 6. If user is an assigned member in project_members
    const members = await db.select().from(projectMembers).where(eq(projectMembers.project_id, projectId));
    const isMember = members.some((m: any) => m.user_id === userId);
    if (isMember) return true;

    return false;
  } catch (err) {
    console.error('Error verifying project access:', err);
    if (process.env.NODE_ENV !== 'production') return true;
    return false;
  }
}
