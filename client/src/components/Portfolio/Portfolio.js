import React from "react";
import styles from "./Portfolio.module.css";
import DashboardCard from "../DashboardCard";
import Table, { TableHeader, TableRow } from "../Table";

const Portfolio = ({
  user,
  gridStyle = {
    gridColumnStart: 3,
    gridColumnEnd: 5,
    gridRowStart: 1,
    gridRowEnd: 2,
  },
}) => {
  return (
    <DashboardCard title={"Portfolio"} gridStyle={gridStyle}>
      <header className={styles.header}>
        <h2 className={styles.header__total}>${user.totalDeposited}</h2>
        <p className={styles.label}>Total owned</p>
      </header>
      {_renderAssets(user.balances)}
    </DashboardCard>
  );
};

const _renderAssets = (assets) => (
  <Table>
    <TableHeader headers={["Asset", "Qty.", "Price", "Total ($)"]} />
    {assets.map((asset, key) => (
      <TableRow
        key={key}
        valuesForEachColumn={[
          asset.name,
          asset.amount,
          asset.price,
          asset.amount * asset.price,
        ]}
      />
    ))}
  </Table>
);

export default Portfolio;
