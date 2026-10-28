import { readTestEnv } from "../env";

Object.assign(process.env, readTestEnv());
