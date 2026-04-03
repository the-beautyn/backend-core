import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly supabaseUrl: string;

  constructor(
    private readonly supabase: SupabaseClient,
    private readonly config: ConfigService,
  ) {
    this.supabaseUrl = this.config.getOrThrow<string>('SUPABASE_URL');
  }

  async upload(bucket: string, path: string, buffer: Buffer, contentType: string): Promise<string> {
    const { error } = await this.supabase.storage.from(bucket).upload(path, buffer, {
      contentType,
      upsert: true,
    });

    if (error) {
      this.logger.error(`Failed to upload ${bucket}/${path}: ${error.message}`);
      throw new InternalServerErrorException('File upload failed');
    }

    return this.getPublicUrl(bucket, path);
  }

  async delete(bucket: string, path: string): Promise<void> {
    const { error } = await this.supabase.storage.from(bucket).remove([path]);

    if (error) {
      this.logger.error(`Failed to delete ${bucket}/${path}: ${error.message}`);
      throw new InternalServerErrorException('File deletion failed');
    }
  }

  getPublicUrl(bucket: string, path: string): string {
    const { data } = this.supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }

  extractPath(bucket: string, publicUrl: string): string | null {
    const prefix = `${this.supabaseUrl}/storage/v1/object/public/${bucket}/`;
    if (!publicUrl.startsWith(prefix)) return null;
    return publicUrl.slice(prefix.length);
  }
}
