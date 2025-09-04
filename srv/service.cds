using { my.packaging as packaging } from '../db/schema';

service PackagingService {
  entity BatchData as projection on packaging.BatchData;
}
