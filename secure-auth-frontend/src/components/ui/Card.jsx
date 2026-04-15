const Card = ({ children, className = '', shadow = 'lg' }) => {
  const shadowClasses = {
    none: '',
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
    xl: 'shadow-xl'
  };

  return (
    <div className={`
      bg-white rounded-2xl p-8 border border-gray-100
      ${shadowClasses[shadow]}
      ${className}
    `}>
      {children}
    </div>
  );
};

export default Card;

