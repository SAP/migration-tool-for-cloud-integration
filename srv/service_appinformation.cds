using migrationtool as my from '../db/schema';

service AppInformation {
    @readonly
    entity LaunchpadInfo                   as projection on my.LaunchpadInfo;
};