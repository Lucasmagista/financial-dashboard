export { getCurrentUser, requireAuth, getUserId, registerUser, loginUser, logout } from './auth-simple';
export type { AuthUser } from './auth-simple';
import { sql } from './db';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

// Change password
export async function changePassword(
  userId: string,
  oldPassword: string,
  newPassword: string
): Promise<void> {
  // Get user
  const result = await sql`
    SELECT password_hash FROM users WHERE id = ${userId} LIMIT 1
  `;

  if (result.length === 0) {
    throw new Error('User not found');
  }

  // Verify old password
  const isValid = await bcrypt.compare(oldPassword, result[0].password_hash);

  if (!isValid) {
    throw new Error('Invalid current password');
  }

  // Hash new password
  const newPasswordHash = await bcrypt.hash(newPassword, 10);

  // Update password
  await sql`
    UPDATE users
    SET password_hash = ${newPasswordHash}
    WHERE id = ${userId}
  `;
}

// Delete all user sessions (logout from all devices)
export async function logoutAllDevices(userId: string): Promise<void> {
  await sql`
    DELETE FROM user_sessions
    WHERE user_id = ${userId}
  `;

  (await cookies()).delete('session_token');
}
