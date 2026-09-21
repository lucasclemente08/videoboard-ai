import { db, eq } from '../config/database';
import { projects, projectMembers } from '../db/schema/projects';

/**
 * Checks if the specified user has authorization to access, modify, or export the project.
 * Allows access if:
 * 1. Project has no owner (legacy/demo seeds).
 * 2. User is the project owner.
 * 3. User is an assigned member in project_members.
 */
export async function hasProjectAccess(projectId: string, userId?: string): Promise<boolean> {
  if (!projectId) return false;
  if (!userId) return false;

  try {
    const rows = await db.select().from(projects).where(eq(projects.id, projectId));
    if (rows.length === 0) return false;

    const project = rows[0] as any;
    if (!project.owner_id) return true;
    if (project.owner_id === userId) return true;

    const members = await db.select().from(projectMembers).where(eq(projectMembers.project_id, projectId));
    const isMember = members.some((m: any) => m.user_id === userId);
    if (isMember) return true;

    return false;
  } catch (err) {
    console.error('Error verifying project access:', err);
    return false;
  }
}
