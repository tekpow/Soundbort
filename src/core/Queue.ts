import { CustomSample } from "./soundboard/CustomSample";
import { StandardSample } from "./soundboard/StandardSample";
import AudioManager, { JoinFailureTypes } from "./audio/AudioManager";
import { EmbedType, replyEmbed, replyEmbedEphemeral } from "../util/builders/embed";
import StatsCollectorManager from "../core/data-managers/StatsCollectorManager";
import * as Discord from "discord.js";
import { AudioPlayerIdleState, AudioPlayerStatus } from "@discordjs/voice";

export interface QueueSample {
    guild: Discord.Guild;
    channel: Discord.GuildBasedChannel;
    sample: CustomSample | StandardSample;
} 

class Queue {
    private queue: QueueSample[] = [];
    private idle = true;

    // add a new sample to the queue
    public async enqueue(sample: QueueSample): Promise<void> {
        this.queue.push(sample);
        
        if (this.idle) {
            await this.play();
        }
    }

    // play the first sample from the queue
    public async play(): Promise<void> {
        const item = this.queue.shift();
        if (!item)
        {
            this.idle = true;
            return;
        }

        this.idle = false;

        // On skip si l'utilisateur est dans le channel AFK
        if (item.channel !== null && item.guild.afkChannelId === item.channel.id) {
            return this.play();
        }

        const subscription = await AudioManager.joinChannel(item.channel);
        if (subscription === JoinFailureTypes.FailedNotInVoiceChannel ||
            subscription === JoinFailureTypes.FailedTryAgain)
        {
            replyEmbedEphemeral("Failed to join voice channel");
            return this.play();
        }

        subscription.audio_player.on("stateChange", async (oldState, newState) => {
            if (newState.status === AudioPlayerStatus.Idle) {
                await this.play();
            }
        });

        await item.sample.play(subscription.audio_player);
        StatsCollectorManager.incPlayedSamples(1);
    }
}

export default new Queue();