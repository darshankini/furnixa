// @ts-check
import { module } from "@prisma/composer";
import backendService from "./backend/service.mjs";

export default module("backend", ({ provision }) => {
  provision(backendService);
});
