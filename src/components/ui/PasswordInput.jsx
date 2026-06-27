'use client';

import { useState } from 'react';
import { KeyRound, Eye, EyeOff } from 'lucide-react';
import Input from './Input';

export default function PasswordInput(props) {
  const [show, setShow] = useState(false);

  return (
    <Input
      type={show ? 'text' : 'password'}
      icon={<KeyRound className="w-5 h-5" />}
      trailing={
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="text-neutral-500 hover:text-primary-600"
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </button>
      }
      {...props}
    />
  );
}
