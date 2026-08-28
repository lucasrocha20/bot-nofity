import express from "express";
import { env } from "./config/env";
import { webhookRouter } from "./routes/webhook";

const app = express();

app.use(
  express.json({
    verify: (req, _res, buf) => {
      (req as express.Request & { rawBody?: Buffer }).rawBody = buf;
    },
  })
);

app.use("/webhook", webhookRouter);

app.listen(env.port, () => {
  console.log(`Servidor rodando na porta ${env.port}`);
});
