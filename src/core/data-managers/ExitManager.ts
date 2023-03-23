import * as Discord from "discord.js";

import * as models from "../../modules/database/models";
import { SoundboardExitSchema } from "../../modules/database/schemas/SoundboardExitSchema";

class ExitManager {
    async addExit(userId: Discord.Snowflake, sampleId: string): Promise<void> {
        await models.exits.insertOne(
            { userId, customSampleId: sampleId }
        );
    }

    async removeExit(userId: Discord.Snowflake, sampleId: string): Promise<void> {
        await models.exits.deleteOne(
            { userId, customSampleId: sampleId },
        );
    }

    async findUserExit(userId: Discord.Snowflake): Promise<SoundboardExitSchema | null> {
        // TODO: renvoyer que les samples dont il a accès
        let exit = await models.exits.findOne({ userId });
        if (!exit)
            return null;

        return exit;
    }
}

export default new ExitManager();
