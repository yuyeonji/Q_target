import { getDb } from "../db/index";
import { seedDevelopmentData } from "../lib/seed";
import { actionPlans, actionTasks, alarms, masterCodes, masterRules, sampleDelayStages, targets } from "../db/schema";

await seedDevelopmentData(getDb(), { alarms, targets, actionPlans, actionTasks, masterRules, masterCodes, sampleDelayStages });
console.log("Development seed applied.");
