export const DocsButton = ({
  href,
  variant = "primary",
  className = "",
  children,
  ...props
}) => {
  const classes = `notra-button notra-button-${variant} ${className}`;

  if (href) {
    return (
      <a className={classes} href={href} {...props}>
        {children}
      </a>
    );
  }

  return (
    <button className={classes} type="button" {...props}>
      {children}
    </button>
  );
};
