import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LocaleProvider } from '@/components/i18n/LocaleProvider';
import LoginPage from '@/app/[lang]/login/page';

const signIn = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  redirect: vi.fn(),
}));

vi.mock('@/components/auth/AuthProvider', () => ({
  useAuth: () => ({ user: null }),
}));

vi.mock('@/lib/auth-client', () => ({
  authClient: { signIn: { email: (...args: unknown[]) => signIn(...args) } },
}));

function renderLogin(lang = 'en') {
  const { container } = render(
    <LocaleProvider lang={lang}>
      <LoginPage />
    </LocaleProvider>
  );
  return {
    container,
    submitButton: () => container.querySelector('button[type="submit"]') as HTMLButtonElement,
  };
}

function submit(container: HTMLElement) {
  fireEvent.change(container.querySelector('#email') as HTMLInputElement, {
    target: { value: 'someone@mathly.local' },
  });
  fireEvent.change(container.querySelector('#password') as HTMLInputElement, {
    target: { value: 'hunter2222' },
  });
  fireEvent.submit(container.querySelector('form') as HTMLFormElement);
}

beforeEach(() => {
  signIn.mockReset();
});

describe('LoginPage', () => {
  it('shows a message and re-enables the button when credentials are rejected', async () => {
    signIn.mockResolvedValue({ error: { code: 'INVALID_EMAIL_OR_PASSWORD', status: 401 } });
    const { container, submitButton } = renderLogin();
    submit(container);

    await waitFor(() =>
      expect(screen.getByText('Invalid credentials. Please try again.')).toBeInTheDocument()
    );
    expect(submitButton()).toBeEnabled();
  });

  it('recovers when the auth client throws instead of returning an error', async () => {
    signIn.mockRejectedValue(new Error('network down'));
    const { container, submitButton } = renderLogin();
    submit(container);

    await waitFor(() =>
      expect(screen.getByText('Something went wrong. Please try again.')).toBeInTheDocument()
    );
    expect(submitButton()).toBeEnabled();
  });

  it('tells a rate limited user to wait rather than blaming their password', async () => {
    signIn.mockResolvedValue({ error: { status: 429 } });
    const { container } = renderLogin();
    submit(container);

    await waitFor(() =>
      expect(
        screen.getByText('Too many attempts. Wait a minute and try again.')
      ).toBeInTheDocument()
    );
  });

  it('reports an unverified account in the page language', async () => {
    signIn.mockResolvedValue({ error: { code: 'EMAIL_NOT_VERIFIED', status: 403 } });
    const { container } = renderLogin('ar');
    submit(container);

    await waitFor(() =>
      expect(screen.getByText('افتح بريدك وفعّل حسابك قبل تسجيل الدخول.')).toBeInTheDocument()
    );
  });
});
