import Link from "next/link";
import type { ButtonHTMLAttributes, MouseEventHandler, ReactNode } from "react";

type Variant = "primary" | "dark" | "secondary" | "ghost";
type Size = "md" | "sm";

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> & {
  variant?: Variant;
  size?: Size;
  iconOnly?: boolean;
  href?: string;
  target?: string;
  onClick?: MouseEventHandler<HTMLElement>;
  children: ReactNode;
};

export function Button({ variant = "secondary", size = "md", iconOnly, href, target, className = "", onClick, children, ...rest }: Props) {
  const cls = `ui-btn ui-btn-${variant} ui-btn-${size}${iconOnly ? " ui-btn-icon" : ""} ${className}`;
  if (href) {
    const external = href.startsWith("http") || target === "_blank";
    return external
      ? <a className={cls} href={href} target={target} rel="noopener" onClick={onClick}>{children}</a>
      : <Link className={cls} href={href} onClick={onClick}>{children}</Link>;
  }
  return <button type="button" className={cls} onClick={onClick} {...rest}>{children}</button>;
}
