import React from "react";
// import { HashLink as Link } from 'react-router-hash-link'
import styles from "./SideBar.module.css";
import { DashboardIcon, ProfileIcon } from "../../icons";

const Sidebar = ({ currentPath, setPath }) => {
  return (
    <section className={styles.sidebar}>
      <div className={styles.icons}>
        <ClickableIcon onClick={() => setPath("/dashboard")}>
          <DashboardIcon active={currentPath === "/dashboard"} />
        </ClickableIcon>
      </div>

      <div className={styles.icons}>
        <ClickableIcon onClick={() => setPath("/profile")}>
          <ProfileIcon active={currentPath === "/profile"} />
        </ClickableIcon>
      </div>
    </section>
  );
};

const ClickableIcon = ({ onClick, children }) => (
  <span style={{ cursor: "pointer" }} onClick={() => onClick()}>
    {children}
  </span>
);

export default Sidebar;
