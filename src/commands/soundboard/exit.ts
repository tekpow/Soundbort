import { CmdInstallerArgs } from "../../util/types";
import { SlashCommand } from "../../modules/commands/SlashCommand";
import { SlashCommandPermissions } from "../../modules/commands/permission/SlashCommandPermissions";
import { createStringOption } from "../../modules/commands/options/string";
import { EmbedType, replyEmbedEphemeral } from "../../util/builders/embed";
import ExitManager from "../../core/data-managers/ExitManager";

import * as models from "../../modules/database/models";

export function install({ registry, admin }: CmdInstallerArgs): void {
    registry.addCommand(new SlashCommand({
        name: "exit",
        description: "Play a sound when you exit a channel.",
        options: [
            createStringOption({
                name: "soundname",
                description: "The sound you want to play when you exit a channel.",
                required: true
            }),
        ],
        permissions: SlashCommandPermissions.EVERYONE,
        async func(interaction) {
            const name = interaction.options.getString("soundname", true).trim();

            let sample = await models.custom_sample.findOne({ name: name });
            if (!sample) {
                return replyEmbedEphemeral(`Couldn't find sample with name or id ${name}`, EmbedType.Error);
            }

            await ExitManager.addExit(interaction.user.id, sample.id);

            return replyEmbedEphemeral(`Successfully created a new exit`, EmbedType.Success);
        },
    }));
}
