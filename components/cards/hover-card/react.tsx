import styled from 'styled-components';

export const meta = {
  name: "Hover Card",
  category: "components",
  subcategory: "cards",
  type: "react",
  tags: ["background", "blur", "card", "dark", "form", "hover", "rounded", "shadow", "transition"],
  dependencies: ["styled-components"],
};

const Card = () => {
  return (
    <StyledWrapper>
      <div className="card">
        <div className="align">
          <span className="red" />
          <span className="yellow" />
          <span className="green" />
        </div>
        <h1>HOVER ME</h1>
        <p>
          Lorem ipsum, dolor sit amet consectetur adipisicing elit. Unde explicabo enim rem odio assumenda?
        </p>
      </div>
    </StyledWrapper>
  );
}

const StyledWrapper = styled.div`
  .card {
    width: 190px;
    height: 120px;
    padding: 0.5rem;
    background: rgba(198, 198, 198, 0.34);
    border-radius: 8px;
    backdrop-filter: blur(5px);
    border-bottom: 3px solid rgba(255, 255, 255, 0.440);
    border-left: 2px  rgba(255, 255, 255, 0.545) outset;
    box-shadow: -40px 50px 30px rgba(0, 0, 0, 0.280);
    transform: skewX(10deg);
    transition: .4s;
    overflow: hidden;
    color: white;
  }

  .card:hover {
    height: 254px;
    transform: skew(0deg);
  }

  .align {
    padding: 1rem;
    display: flex;
    flex-direction: row;
    gap: 5px;
    align-self: flex-start;
  }

  .red {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background-color: #ff605c;
    box-shadow: -5px 5px 5px rgba(0, 0, 0, 0.280);
  }

  .yellow {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background-color: #ffbd44;
    box-shadow: -5px 5px 5px rgba(0, 0, 0, 0.280);
  }

  .green {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background-color: #00ca4e;
    box-shadow: -5px 5px 5px rgba(0, 0, 0, 0.280);
  }

  .card h1 {
    text-align: center;
    margin: 1.3rem;
    color: rgb(218, 244, 237);
    text-shadow: -10px 5px 10px rgba(0, 0, 0, 0.573);
  }`;

export default Card;