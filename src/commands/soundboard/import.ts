import * as Discord from "discord.js";

import { BUTTON_TYPES, SAMPLE_TYPES } from "../../const";

import { CmdInstallerArgs } from "../../util/types";
import { SlashCommand } from "../../modules/commands/SlashCommand";
import { SlashCommandPermissions } from "../../modules/commands/permission/SlashCommandPermissions";
import { createStringOption } from "../../modules/commands/options/string";
import { createChoice } from "../../modules/commands/choice";
import { EmbedType, replyEmbedEphemeral } from "../../util/builders/embed";

import { CustomSample } from "../../core/soundboard/CustomSample";
import { UploadErrors } from "../../core/soundboard/methods/upload";

async function importUser(interaction: Discord.ButtonInteraction | Discord.CommandInteraction, sample: CustomSample) {
    const user = interaction.user;

    if (await CustomSample.findSampleUser(user.id, sample.name)) {
        return replyEmbedEphemeral("You already have a sample with this name in your soundboard.", EmbedType.Error);
    }

    await CustomSample.import(user, sample);

    return await sample.toEmbed({ description: `Successfully imported sample "${sample.name}."`, type: EmbedType.Success });
}

export function install({ registry, admin }: CmdInstallerArgs): void {
    async function importServer(interaction: Discord.ButtonInteraction | Discord.CommandInteraction, sample: CustomSample) {
        if (!interaction.inCachedGuild()) {
            return replyEmbedEphemeral("You're not in a server.", EmbedType.Error);
        }

        const guildId = interaction.guildId;
        const guild = interaction.guild;
        const user = interaction.user;

        if (!await admin.isAdmin(guild, user.id)) {
            return replyEmbedEphemeral("You're not a moderator of this server, you can't remove server samples.", EmbedType.Error);
        }

        if (await CustomSample.findSampleGuild(guildId, sample.name)) {
            return replyEmbedEphemeral("You already have a sample with this name in your soundboard.", EmbedType.Error);
        }

        await CustomSample.import(guild, sample);

        return await sample.toEmbed({ description: `Successfully imported sample "${sample.name}."`, type: EmbedType.Success });
    }

    registry.addCommand(new SlashCommand({
        name: "import",
        description: "Import a sample from another user or server to your or your server's soundboard.",
        options: [
            createStringOption({
                name: "sample_id",
                description: "A sample identifier (sXXXXXX). Get the ID of a sample from typing `/info <name>`.",
                required: true,
            }),
            createStringOption({
                name: "to",
                description: "Choose the soundboard to import the sound to. Defaults to your personal soundboard.",
                choices: [
                    createChoice("Import into your personal soundboard.", SAMPLE_TYPES.USER),
                    createChoice("Import into server soundboard for every member to use.", SAMPLE_TYPES.SERVER),
                ],
            }),
        ],
        permissions: SlashCommandPermissions.EVERYONE,
        async func(interaction) {
            const id = interaction.options.getString("sample_id", true).trim();
            const scope = interaction.options.getString("to", false) as (SAMPLE_TYPES.USER | SAMPLE_TYPES.SERVER | null) || SAMPLE_TYPES.USER;

            const sample = await CustomSample.findById(id);
            if (!sample) {
                return replyEmbedEphemeral(`Couldn't find sample with id ${id}`, EmbedType.Error);
            }

            if (!sample.importable) {
                return replyEmbedEphemeral("This sample is marked as not importable.", EmbedType.Error);
            }

            if (scope === SAMPLE_TYPES.USER) return await importUser(interaction, sample);
            return await importServer(interaction, sample);
        },
    }));

    registry.addButton({ t: BUTTON_TYPES.IMPORT_USER }, async (interaction, decoded) => {
        const id = decoded.id as string;
        const sample = await CustomSample.findById(id);
        if (!sample) {
            return replyEmbedEphemeral("That sample doesn't exist anymore.", EmbedType.Error);
        }

        return await importUser(interaction, sample);
    });

    registry.addButton({ t: BUTTON_TYPES.IMPORT_SERVER }, async (interaction, decoded) => {
        const id = decoded.id as string;
        const sample = await CustomSample.findById(id);
        if (!sample) {
            return replyEmbedEphemeral("That sample doesn't exist anymore.", EmbedType.Error);
        }

        return await importServer(interaction, sample);
    });
}
