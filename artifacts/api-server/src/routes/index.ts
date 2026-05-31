import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import foldersRouter from "./folders";
import filesRouter from "./files";
import logsRouter from "./logs";
import categoriesRouter from "./categories";
import dashboardRouter from "./dashboard";
import chatRouter from "./chat";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(foldersRouter);
router.use(filesRouter);
router.use(logsRouter);
router.use(categoriesRouter);
router.use(dashboardRouter);
router.use(chatRouter);

export default router;
