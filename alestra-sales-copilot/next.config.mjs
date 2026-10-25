/** @type {import('next').NextConfig} */
const nextConfig = {
  // Deshabilitar el linting en build para el hackathon
  eslint: {
    ignoreDuringBuilds: false,
  },
  // Asegurar que los archivos grandes del catálogo no se transpilen en cliente
  serverExternalPackages: ['docx'],
};

export default nextConfig;
