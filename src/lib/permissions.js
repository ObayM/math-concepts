import { createAccessControl } from 'better-auth/plugins/access';
import { defaultStatements, adminAc } from 'better-auth/plugins/admin/access';

export const statement = {
  ...defaultStatements,
  content: ['read', 'create', 'update', 'publish', 'delete'],
};

const ac = createAccessControl(statement);

const student = ac.newRole({});

const admin = ac.newRole({
  content: ['read', 'create', 'update', 'publish'],
  user: ['list', 'get', 'impersonate'],
});

const super_admin = ac.newRole({
  ...adminAc.statements,
  user: [...adminAc.statements.user, 'impersonate-admins'],
  content: ['read', 'create', 'update', 'publish', 'delete'],
});

export const roles = { student, admin, super_admin };

export { ac };

export const ROLES = {
  STUDENT: 'student',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin',
};

export const ADMIN_ROLES = [ROLES.ADMIN, ROLES.SUPER_ADMIN];
