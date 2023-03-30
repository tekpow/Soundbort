/* eslint-disable no-console */
import { promisify } from "node:util";
import temp from "temp";
import fsDefault from "node:fs";
import * as fs from "node:fs/promises";
import { pipeline } from "node:stream/promises";

import { SAMPLE_TYPES } from "../../const";

import { CmdInstallerArgs } from "../../util/types";
import { SlashCommand } from "../../modules/commands/SlashCommand";
import { SlashCommandPermissions } from "../../modules/commands/permission/SlashCommandPermissions";
import { createStringOption } from "../../modules/commands/options/string";
import { createAttachmentOption } from "../../modules/commands/options/attachment";
import { createChoice } from "../../modules/commands/choice";
import { EmbedType, replyEmbed } from "../../util/builders/embed";
import { upload, UploadErrors, importIntoBoard } from "../../core/soundboard/methods/upload";
import { unzipFile } from "../../util/files";

import { downloadFile, isEnoughDiskSpace } from "../../util/files";
import { stdout } from "node:process";

export function install({ registry, admin }: CmdInstallerArgs): void {
    const AUDO_ARCHIVE_PARAM = "audio-zip-archive";

    registry.addCommand(new SlashCommand({
        name: "import-bulk",
        description: "Imports a folder of sound files into the database. file names will be used as the sample name.",
        options: [
            createAttachmentOption({
                name: AUDO_ARCHIVE_PARAM,
                description: "The audio files zip where your sound files are located. (Must be a single folder)",
            }),
            createStringOption({
                name: "to",
                description: "Choose the soundboard to import the sound to. Defaults to the server soundboard.",
                choices: [
                    createChoice("Import into server soundboard for every member to use.", SAMPLE_TYPES.SERVER),
                    createChoice("Import into your personal soundboard.", SAMPLE_TYPES.USER),
                ],
            }),
        ],
        permissions: SlashCommandPermissions.ADMIN,
        async func(interaction) {
            try {
                await interaction.reply(replyEmbed("Processing audio files... (this may take a while)"));

                const attachment = interaction.options.getAttachment(AUDO_ARCHIVE_PARAM);
                const to = interaction.options.getString("to", false) as (SAMPLE_TYPES.USER | SAMPLE_TYPES.SERVER | null) || SAMPLE_TYPES.SERVER;

                if (!attachment) {
                    await interaction.reply(replyEmbed(UploadErrors.FileMissing, EmbedType.Error));
                    return;
                }

                const raw_file_name = temp.path({
                    prefix: "audio_files_",
                    suffix: attachment.name || "unknown",
                });
                await downloadFile(attachment.url, raw_file_name);

                const file = await fs.open(raw_file_name, "r");

                // show file type and size in console
                const content = await file.readFile();
                console.log(content);
                const zipfile = await unzipFile(content);

                const openReadStream = promisify(zipfile.openReadStream.bind(zipfile));

                const isFileSupported = (fileName: string) => {
                    if (!(/\.(mp3)$/i.test(fileName))) return false;
                    if (/^__macosx/i.test(fileName)) return false;
                    if (/ds_store/i.test(fileName)) return false;
                    return true;
                };

                zipfile.readEntry();
                zipfile.on("entry", async (entry: any) => {
                    if (/\/$/.test(entry.fileName)) zipfile.readEntry();
                    else {
                        // Audio files
                        const isSupported = isFileSupported(entry.fileName);
                        // strip filename of any path information
                        const fileName = entry.fileName.replace(/^.*[/\\]/, "");
                        if (isSupported) {
                            await interaction.editReply(replyEmbed(`Processing audio file: ${fileName}\n`));

                            // Create a temporary file to store the audio file
                            const entryFile = temp.path({
                                prefix: "audio_file_",
                                suffix: fileName,
                            });
                            // Open a write stream to the temporary file and pipe the audio file to it
                            const readingStream = await openReadStream(entry);
                            await pipeline(
                                readingStream,
                                fsDefault.createWriteStream(entryFile),
                            );

                            const filenameWithoutExtension = fileName.replace(/\.[^/.]+$/, "");

                            console.log(filenameWithoutExtension);
                            for await (const status of importIntoBoard(entryFile, filenameWithoutExtension, interaction.user, interaction.guild!, to)) {
                                await interaction.editReply(status);
                            }
                        }
                        else {
                            await interaction.editReply(replyEmbed(`Ignoring file: ${entry.fileName} (unsupported file type)\n`));
                        }

                        zipfile.readEntry();
                    }
                });
                zipfile.on("end", () => {
                    console.log("end of entries");
                });
            } catch (error: any) {
                console.log(error);

                switch (error.message) {
                    case (`Required option "${AUDO_ARCHIVE_PARAM}" not found.`): {
                        await interaction.reply(replyEmbed("You must provide a zip archive of your sound files.", EmbedType.Error));
                        return;
                    }
                    default: {
                        await interaction.reply(replyEmbed("An unknown error occurred.", EmbedType.Error));
                        return;
                    }
                }
            }
            await interaction.reply(replyEmbed("Successfully imported all sound files", EmbedType.Success));
        },
    }));
}