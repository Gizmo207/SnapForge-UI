import styled from 'styled-components';

export const meta = {
  name: "Animated Checkbox",
  category: "primitives",
  subcategory: "checkboxes",
  type: "react",
  tags: ["animation", "background", "checkbox", "dark", "form", "glitch", "hover", "input", "shadow", "transition"],
  dependencies: ["styled-components"],
};

const Checkbox = () => {
  return (
    <StyledWrapper>
      <div className="glitch-checkbox-wrapper">
        <label className="glitch-checkbox-container">
          <input type="checkbox" name="option1" defaultChecked />
          <div className="checkbox-box">
            <div className="checkbox-mark" />
          </div>
          <span className="checkbox-label" data-text="ENABLE_ENCRYPTION">ENABLE_ENCRYPTION</span>
        </label>
        <label className="glitch-checkbox-container">
          <input type="checkbox" name="option2" />
          <div className="checkbox-box">
            <div className="checkbox-mark" />
          </div>
          <span className="checkbox-label" data-text="ACTIVATE_STEALTH_MODE">ACTIVATE_STEALTH_MODE</span>
        </label>
        <label className="glitch-checkbox-container">
          <input type="checkbox" name="option3" disabled />
          <div className="checkbox-box">
            <div className="checkbox-mark" />
          </div>
          <span className="checkbox-label" data-text="[PERMISSION_DENIED]">[PERMISSION_DENIED]</span>
        </label>
      </div>
    </StyledWrapper>
  );
}

const StyledWrapper = styled.div`
  /* --- Root Variables & Wrapper --- */
  .glitch-checkbox-wrapper {
    --bg-color: #0d0d0d;
    --primary-color: #00f2ea;
    --secondary-color: #a855f7;
    --text-color: #e5e5e5;
    --disabled-color: #555;
    --font-family: "Fira Code", Consolas, "Courier New", Courier, monospace;
    --glitch-anim-duration: 0.3s;

    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    font-family: var(--font-family);
    background-color: #050505;
    padding: 2rem;
    border-radius: 1rem;
  }

  /* --- Container Checkbox --- */
  .glitch-checkbox-container {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    cursor: pointer;
    user-select: none;
    position: relative;
  }

  .glitch-checkbox-container input[type="checkbox"] {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
  }

  /* --- Checkbox --- */
  .checkbox-box {
    width: 1.5em;
    height: 1.5em;
    border: 2px solid var(--primary-color);
    position: relative;
    transition: all 0.3s ease;

    clip-path: polygon(
      15% 0,
      85% 0,
      100% 15%,
      100% 85%,
      85% 100%,
      15% 100%,
      0 85%,
      0 15%
    );
  }

  .checkbox-mark {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 60%;
    height: 60%;
    background-color: var(--primary-color);
    transform: translate(-50%, -50%) scale(0);
    opacity: 0;
    transition: all 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28);
    clip-path: inherit;
  }

  /* --- Label --- */
  .checkbox-label {
    color: var(--text-color);
    font-weight: 500;
    font-size: 1rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    position: relative;
    transition:
      color 0.3s ease,
      text-shadow 0.3s ease;
  }

  /* --- Checked --- */
  .glitch-checkbox-container input:checked + .checkbox-box .checkbox-mark {
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
    animation: glitch-anim-checkbox var(--glitch-anim-duration) both;
  }

  .glitch-checkbox-container input:checked ~ .checkbox-label {
    color: var(--primary-color);
    text-shadow: 0 0 8px rgba(0, 242, 234, 0.7);
  }

  /* --- Hover --- */
  .glitch-checkbox-container:hover .checkbox-box {
    box-shadow: 0 0 10px var(--primary-color);
  }

  .glitch-checkbox-container:hover .checkbox-label::before,
  .glitch-checkbox-container:hover .checkbox-label::after {
    content: attr(data-text);
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: #050505;
  }

  .glitch-checkbox-container:hover .checkbox-label::before {
    color: var(--secondary-color);
    animation: glitch-anim-text var(--glitch-anim-duration)
      cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
  }

  .glitch-checkbox-container:hover .checkbox-label::after {
    color: var(--primary-color);
    animation: glitch-anim-text var(--glitch-anim-duration)
      cubic-bezier(0.25, 0.46, 0.45, 0.94) reverse both;
  }

  /* ---  Disabled --- */
  .glitch-checkbox-container:has(input:disabled) {
    cursor: not-allowed;
  }

  .glitch-checkbox-container input:disabled + .checkbox-box {
    border-color: var(--disabled-color);
    opacity: 0.5;
    box-shadow: none;
  }

  .glitch-checkbox-container input:disabled ~ .checkbox-label {
    color: var(--disabled-color);
    text-shadow: none;
  }

  .glitch-checkbox-container:has(input:disabled):hover .checkbox-box {
    box-shadow: none;
  }
  .glitch-checkbox-container:has(input:disabled):hover .checkbox-label::before,
  .glitch-checkbox-container:has(input:disabled):hover .checkbox-label::after {
    content: none;
  }

  /* --- Keyframes --- */
  @keyframes glitch-anim-checkbox {
    0% {
      transform: translate(-50%, -50%);
      clip-path: inset(0 0 0 0);
    }
    20% {
      transform: translate(calc(-50% - 3px), calc(-50% + 2px));
      clip-path: inset(50% 0 20% 0);
    }
    40% {
      transform: translate(calc(-50% + 2px), calc(-50% - 1px));
      clip-path: inset(20% 0 60% 0);
    }
    60% {
      transform: translate(calc(-50% - 2px), calc(-50% + 1px));
      clip-path: inset(80% 0 5% 0);
    }
    80% {
      transform: translate(calc(-50% + 2px), calc(-50% - 2px));
      clip-path: inset(30% 0 45% 0);
    }
    100% {
      transform: translate(-50%, -50%);
      clip-path: inset(0 0 0 0);
    }
  }

  @keyframes glitch-anim-text {
    0% {
      transform: translate(0);
      clip-path: inset(0 0 0 0);
    }
    20% {
      transform: translate(-3px, 2px);
      clip-path: inset(50% 0 20% 0);
    }
    40% {
      transform: translate(2px, -1px);
      clip-path: inset(20% 0 60% 0);
    }
    60% {
      transform: translate(-2px, 1px);
      clip-path: inset(80% 0 5% 0);
    }
    80% {
      transform: translate(2px, -2px);
      clip-path: inset(30% 0 45% 0);
    }
    100% {
      transform: translate(0);
      clip-path: inset(0 0 0 0);
    }
  }`;

export default Checkbox;