import Link from "next/link";

export const LinkComponent: React.FC<{
  href: string;
  children: any;
  target?: "string";
}> = ({
  href,
  children,
  target = process.env.NEXT_PUBLIC_BUILD_MODE === "EXPORT" ? "_self" : "_blank",
}) => {
  return (
    <Link legacyBehavior href={href} prefetch>
      <a className="text-primary" target={target}>
        {children}
      </a>
    </Link>
  );
};
