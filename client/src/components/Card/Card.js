import React from "react";
import styles from "./Card.module.css";

const Card = ({ children, flex }) => {
  return (
    <div className={styles.card} style={{ flex: flex }}>
      {children}
    </div>
  );
};

export default Card;
