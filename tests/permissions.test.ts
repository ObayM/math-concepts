import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { roles, statement, ROLES, ADMIN_ROLES } from '@/lib/permissions';

type Role = keyof typeof roles;

const allows = (role: Role, permissions: Record<string, string[]>) =>
  roles[role].authorize(permissions as never).success;

describe('student', () => {
  it('is denied every resource in the statement', () => {
    for (const [resource, actions] of Object.entries(statement)) {
      for (const action of actions as readonly string[]) {
        expect(allows('student', { [resource]: [action] }), `student ${resource}:${action}`).toBe(
          false
        );
      }
    }
  });
});

describe('admin', () => {
  it('can author content', () => {
    for (const action of ['read', 'create', 'update', 'publish']) {
      expect(allows('admin', { content: [action] }), `admin content:${action}`).toBe(true);
    }
  });

  it('cannot delete content', () => {
    expect(allows('admin', { content: ['delete'] })).toBe(false);
  });

  it('cannot escalate privileges', () => {
    for (const action of ['set-role', 'ban', 'delete', 'set-password', 'set-email', 'create']) {
      expect(allows('admin', { user: [action] }), `admin user:${action}`).toBe(false);
    }
  });

  it('cannot impersonate another admin', () => {
    expect(allows('admin', { user: ['impersonate'] })).toBe(true);
    expect(allows('admin', { user: ['impersonate-admins'] })).toBe(false);
  });

  it('has no session powers at all', () => {
    for (const action of statement.session as readonly string[]) {
      expect(allows('admin', { session: [action] }), `admin session:${action}`).toBe(false);
    }
  });
});

describe('super_admin', () => {
  it('can do everything in the statement', () => {
    for (const [resource, actions] of Object.entries(statement)) {
      for (const action of actions as readonly string[]) {
        expect(
          allows('super_admin', { [resource]: [action] }),
          `super_admin ${resource}:${action}`
        ).toBe(true);
      }
    }
  });

  it('is the only role that can impersonate an admin', () => {
    expect(allows('super_admin', { user: ['impersonate-admins'] })).toBe(true);
  });
});

describe('the matrix itself', () => {
  it('is exactly this, so any drift in either direction fails here', () => {
    expect({
      student: roles.student.statements,
      admin: roles.admin.statements,
      super_admin: roles.super_admin.statements,
    }).toEqual({
      student: {},
      admin: {
        content: ['read', 'create', 'update', 'publish'],
        user: ['list', 'get', 'impersonate'],
      },
      super_admin: {
        content: ['read', 'create', 'update', 'publish', 'delete'],
        user: [
          'create',
          'list',
          'set-role',
          'ban',
          'impersonate',
          'delete',
          'set-password',
          'set-email',
          'get',
          'update',
          'impersonate-admins',
        ],
        session: ['list', 'revoke', 'delete'],
      },
    });
  });

  it('names the roles the auth config and authz helpers agree on', () => {
    expect(Object.keys(roles).sort()).toEqual(Object.values(ROLES).sort());
    expect(ADMIN_ROLES).toEqual([ROLES.ADMIN, ROLES.SUPER_ADMIN]);
  });
});

describe('client safety', () => {
  it('imports nothing server-only, because auth-client.js bundles this file', () => {
    const src = readFileSync(
      fileURLToPath(new URL('../src/lib/permissions.js', import.meta.url)),
      'utf8'
    );
    const imports = [...src.matchAll(/from\s+'([^']+)'/g)].map((m) => m[1]);
    expect(imports).toEqual(['better-auth/plugins/access', 'better-auth/plugins/admin/access']);
  });
});
