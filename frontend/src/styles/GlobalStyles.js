import { createGlobalStyle } from 'styled-components';

const GlobalStyles = createGlobalStyle`
  :root {
    --primary-gradient: linear-gradient(135deg, #00c6ff 0%, #0072ff 100%);
    --secondary-gradient: linear-gradient(135deg, #7928ca 0%, #ff0080 100%);
    --accent-gradient: linear-gradient(135deg, #00b4db 0%, #0083b0 100%);
    --background-gradient: linear-gradient(135deg, #000000 0%, #1a1a1a 100%);
    --card-gradient: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%);
    --glass-bg: rgba(255, 255, 255, 0.03);
  }

  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    background: var(--background-gradient);
    color: #fff;
    min-height: 100vh;
    overflow-x: hidden;
  }

  .gradient-text {
    background: var(--primary-gradient);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .glass-card {
    background: var(--glass-bg);
    backdrop-filter: blur(10px);
    border-radius: 15px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
  }

  .hover-effect {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    &:hover {
      transform: translateY(-5px);
      box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
    }
  }

  .gradient-border {
    position: relative;
    &::before {
      content: '';
      position: absolute;
      top: -2px;
      left: -2px;
      right: -2px;
      bottom: -2px;
      background: var(--primary-gradient);
      border-radius: 16px;
      z-index: -1;
      opacity: 0.5;
    }
  }

  @keyframes float {
    0% {
      transform: translateY(0px) rotate(0deg);
    }
    50% {
      transform: translateY(-10px) rotate(2deg);
    }
    100% {
      transform: translateY(0px) rotate(0deg);
    }
  }

  .floating {
    animation: float 3s ease-in-out infinite;
  }

  @keyframes pulse {
    0% {
      box-shadow: 0 0 0 0 rgba(0, 198, 255, 0.4);
    }
    70% {
      box-shadow: 0 0 0 10px rgba(0, 198, 255, 0);
    }
    100% {
      box-shadow: 0 0 0 0 rgba(0, 198, 255, 0);
    }
  }

  .pulse {
    animation: pulse 2s infinite;
  }

  /* Custom Scrollbar */
  ::-webkit-scrollbar {
    width: 8px;
  }

  ::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.1);
  }

  ::-webkit-scrollbar-thumb {
    background: var(--primary-gradient);
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: var(--secondary-gradient);
  }
`;

export default GlobalStyles; 