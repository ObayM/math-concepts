import type en from './en';

export type MessageKey = keyof typeof en;

// keys are typed, values are not. pinning the value shape to english would fix
// each plural entry to english's own categories, and arabic uses six.
export type PluralMessage = Partial<Record<Intl.LDMLPluralRule, string>>;

export type Message = string | PluralMessage;

export type Dictionary = Record<MessageKey, Message>;

export type Vars = Record<string, string | number>;
