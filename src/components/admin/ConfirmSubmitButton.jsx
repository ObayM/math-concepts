'use client';

import Button from '@/components/ui/Button';

export default function ConfirmSubmitButton({ confirmText, children, ...props }) {
  return (
    <Button
      type="submit"
      onClick={(e) => {
        if (!window.confirm(confirmText)) e.preventDefault();
      }}
      {...props}
    >
      {children}
    </Button>
  );
}
