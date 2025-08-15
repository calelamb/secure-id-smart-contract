import React from 'react';

const StackwellLogo = ({ size = 32, className = "" }) => {
  return (
    <img
      src="/stackwell-logo.png"
      alt="Stackwell"
      width={size}
      height={size}
      className={`${className} object-contain`}
      style={{ width: size, height: size }}
    />
  );
};

export default StackwellLogo;
