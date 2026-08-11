import { getDb } from "../db/index";
import { seedDevelopmentData } from "../lib/seed";
import { actionPlans, actionTasks, alarms, sampleDelayStages, targets } from "../db/schema";

await seedDevelopmentData(getDb(), { alarms, targets, actionPlans, actionTasks, sampleDelayStages });
console.log("Development seed applied.");
