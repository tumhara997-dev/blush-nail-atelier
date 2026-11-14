import "./load-env";
import { runMigrations, closeDb } from "./index";

runMigrations()
  .then(() => console.log("✔ migrations applied"))
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(closeDb);
