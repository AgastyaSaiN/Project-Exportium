import React from 'react';
import logoSrc from '../assets/logo.png';

const LogoIcon: React.FC<React.ImgHTMLAttributes<HTMLImageElement>> = (props) => (
    <img src={logoSrc} alt="Exportium Logo" {...props} />
);

export default LogoIcon;
