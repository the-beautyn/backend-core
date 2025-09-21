import { Module } from '@nestjs/common';
import { MergePolicyService } from './merge-policy.service';
import { ConflictResolverService } from './conflict-resolver.service';
import { ShadowStoreService } from './shadow-store.service';
import { OutboxService } from './outbox.service';

@Module({
  providers: [MergePolicyService, ConflictResolverService, ShadowStoreService, OutboxService],
  exports:   [MergePolicyService, ConflictResolverService, ShadowStoreService, OutboxService],
})
export class SyncReconciliationModule {}

