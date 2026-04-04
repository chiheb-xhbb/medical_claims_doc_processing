function Loader({ message = 'Loading...', size = 'md', fullHeight = true }) {
  const sizeStyles = {
    sm: { width: '1.5rem', height: '1.5rem', borderWidth: '0.15rem' },
    md: { width: '3rem', height: '3rem', borderWidth: '0.25rem' },
    lg: { width: '4rem', height: '4rem', borderWidth: '0.3rem' }
  };

  const spinnerStyle = sizeStyles[size] || sizeStyles.md;
  
  const containerStyle = fullHeight 
    ? { minHeight: '400px' } 
    : {};

  return (
    <div 
      className="d-flex flex-column justify-content-center align-items-center" 
      style={containerStyle}
    >
      <div 
        className="spinner-border text-primary mb-3" 
        role="status"
        style={spinnerStyle}
      >
        <span className="visually-hidden">{message}</span>
      </div>
      {message && (
        <p className="text-muted mb-0">{message}</p>
      )}
    </div>
  );
}

export default Loader;
