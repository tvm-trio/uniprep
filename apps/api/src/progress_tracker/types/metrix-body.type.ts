import { Metrix } from '../interfaces';

export type MetrixBodyType = Omit<Metrix, 'id' | 'user_id' | 'updated_at'>;
