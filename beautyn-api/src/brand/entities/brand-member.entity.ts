export class BrandMemberEntity {
  id!: string;
  brandId!: string;
  userId!: string;
  role!: 'owner' | 'manager' | 'support';
  lastSelectedSalonId?: string | null;
  createdAt!: Date;
  updatedAt!: Date;
}
