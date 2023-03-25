import { SlashSubCommand } from "../../modules/commands/SlashSubCommand";
import { createStringOption } from "../../modules/commands/options/string";
import { EmbedType, replyEmbedEphemeral } from "../../util/builders/embed";

import { CustomSample } from "../../core/soundboard/CustomSample";
import { StandardSample } from "../../core/soundboard/StandardSample";

export default new SlashSubCommand({
    name: "import",
    description: "Import a sample from another user or server to your or your server's soundboard.",
    options: [
        createStringOption({
            name: "sample_id",
            description: "A sample identifier (sXXXXXX). Get the ID of a sample from typing `/info <name>`.",
            required: true,
        }),
    ],
    async func(interaction) {
        const id = interaction.options.getString("sample_id", true).trim();

        const sample = await CustomSample.findById(id);
        if (!sample) {
            return replyEmbedEphemeral(`Couldn't find sample with id ${id}`, EmbedType.Error);
        }

        if (!sample.importable) {
            return replyEmbedEphemeral("This sample is marked as not importable.", EmbedType.Error);
        }

        if (await StandardSample.findByName(sample.name)) {
            return replyEmbedEphemeral("You already have a sample with this name in your soundboard.", EmbedType.Error);
        }

        const new_sample = await StandardSample.import(sample);

        return await new_sample.toEmbed({ description: `Successfully imported sample "${new_sample.name}."`, type: EmbedType.Success });
    },
});
