
const StarBorder = ({
  as: Component = "div",
  className = "",
  color = "#2563eb",
  speed = "6s",
  children,
  ...rest
}) => {
  return (
    <Component
      className={`relative overflow-visible ${className}`}
      {...rest}
    >
      {/* Star border effect only, non-intrusive */}
      <div
        className="pointer-events-none absolute w-[300%] h-[50%] opacity-70 bottom-[-11px] right-[-250%] rounded-full animate-star-movement-bottom z-10"
        style={{
          background: `radial-gradient(circle, ${color}, transparent 10%)`,
          animationDuration: speed,
        }}
      ></div>
      <div
        className="pointer-events-none absolute w-[300%] h-[50%] opacity-70 top-[-10px] left-[-250%] rounded-full animate-star-movement-top z-10"
        style={{
          background: `radial-gradient(circle, ${color}, transparent 10%)`,
          animationDuration: speed,
        }}
      ></div>
      {/* Card or button content remains untouched */}
      {children}
    </Component>
  );
};

export default StarBorder;

