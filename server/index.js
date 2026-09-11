import { createApp } from "./src/app.js";
import { env } from "./src/config/env.js";

const app = createApp();

app.listen(env.port, () => {
  console.log(`Server is running on port ${env.port}`);
  console.log(
    `API documentation available at http://localhost:${env.port}/api-docs`,
  );
});
