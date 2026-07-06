-- =============================================================================
-- 0002_schema.sql
-- Yellow Point Lodge production tables generated from the Access schema export.
--
-- Generated from mdbtools output for legacy-db/YPLogicCurrentConsolidated.accdb.
-- Access source tables are renamed to intuitive snake_case identifiers in schema ypl
-- for Supabase table-editor users. Access columns are preserved as the
-- mdbtools-normalized field names so exports can load losslessly.
-- The two Access system navigation foreign keys emitted by mdbtools are omitted
-- because their MSysNavPane* tables were not exported as user tables.
-- =============================================================================

set search_path = ypl, public;

-- ----------------------------------------------------------
-- MDB Tools - A library for reading MS Access database files
-- Copyright (C) 2000-2011 Brian Bruns and others.
-- Files in libmdb are licensed under LGPL and the utilities under
-- the GPL, see COPYING.LIB and COPYING files respectively.
-- Check out http://mdbtools.sourceforge.net
-- ----------------------------------------------------------

SET client_encoding = 'UTF-8';

CREATE TABLE IF NOT EXISTS "application_information"
 (
	"softwarename"			VARCHAR (50) NOT NULL,
	"softwarenamelong"			VARCHAR (50),
	"version"			VARCHAR (50),
	"copyrightdate"			TIMESTAMP WITHOUT TIME ZONE,
	"technicalsupport"			TEXT,
	"processor"			VARCHAR (50),
	"operatingsystem"			VARCHAR (50),
	"ram"			VARCHAR (50),
	"harddrive"			VARCHAR (50),
	"softwarerequirement"			VARCHAR (50),
	"projectcompletiondate"			TIMESTAMP WITHOUT TIME ZONE,
	"developerfirstname"			VARCHAR (50),
	"developerlastname"			VARCHAR (50),
	"developercompanyname"			VARCHAR (50),
	"developerphone"			VARCHAR (50),
	"developerfax"			VARCHAR (50),
	"developeremail"			VARCHAR (50),
	"developerwebsite"			TEXT,
	"developerlogo"			BYTEA,
	"developerlogoalternate"			BYTEA,
	"developercompanyinfo"			TEXT,
	"archivecomments"			TEXT
);

-- CREATE INDEXES ...
ALTER TABLE "application_information" ADD CONSTRAINT "application_information_pkey" PRIMARY KEY ("softwarename");

CREATE TABLE IF NOT EXISTS "application_information_from_back"
 (
	"softwarename"			VARCHAR (50) NOT NULL,
	"softwarenamelong"			VARCHAR (50),
	"version"			VARCHAR (50),
	"copyrightdate"			TIMESTAMP WITHOUT TIME ZONE,
	"technicalsupport"			TEXT,
	"processor"			VARCHAR (50),
	"operatingsystem"			VARCHAR (50),
	"ram"			VARCHAR (50),
	"harddrive"			VARCHAR (50),
	"softwarerequirement"			VARCHAR (50),
	"projectcompletiondate"			TIMESTAMP WITHOUT TIME ZONE,
	"developerfirstname"			VARCHAR (50),
	"developerlastname"			VARCHAR (50),
	"developercompanyname"			VARCHAR (50),
	"developerphone"			VARCHAR (50),
	"developerfax"			VARCHAR (50),
	"developeremail"			VARCHAR (50),
	"developerwebsite"			TEXT,
	"developerlogo"			BYTEA,
	"developerlogoalternate"			BYTEA,
	"developercompanyinfo"			TEXT
);

-- CREATE INDEXES ...
ALTER TABLE "application_information_from_back" ADD CONSTRAINT "application_information_from_back_pkey" PRIMARY KEY ("softwarename");

CREATE TABLE IF NOT EXISTS "application_objects"
 (
	"object"			VARCHAR (255),
	"name"			VARCHAR (255)
);

-- CREATE INDEXES ...

CREATE TABLE IF NOT EXISTS "application_registration"
 (
	"registrationid"			SERIAL,
	"licensedtofirstname"			VARCHAR (50),
	"licensedtolastname"			VARCHAR (50),
	"companyname"			VARCHAR (75),
	"companyunit"			VARCHAR (10),
	"companyaddress1"			VARCHAR (75),
	"companyaddress2"			VARCHAR (75),
	"companycity"			VARCHAR (35),
	"companyregion"			VARCHAR (2),
	"companypostalcode"			VARCHAR (7),
	"companyzipcode"			VARCHAR (30),
	"companyphone"			VARCHAR (14),
	"companyfax"			VARCHAR (14),
	"companyemail"			VARCHAR (50),
	"companywebsite"			TEXT,
	"companylogo"			BYTEA,
	"companylogobw"			BYTEA
);

-- CREATE INDEXES ...
CREATE INDEX "application_registration_companypostalcode_idx" ON "application_registration" ("companypostalcode");
CREATE INDEX "application_registration_companyzipcode_idx" ON "application_registration" ("companyzipcode");
ALTER TABLE "application_registration" ADD CONSTRAINT "application_registration_pkey" PRIMARY KEY ("registrationid");

CREATE TABLE IF NOT EXISTS "application_specifications"
 (
	"specid"			SERIAL,
	"applicationname"			VARCHAR (50),
	"purpose"			TEXT,
	"budget"			NUMERIC(15,2),
	"authorizedby"			VARCHAR (50),
	"projectmanager"			VARCHAR (50),
	"network"			BOOLEAN NOT NULL,
	"networkadministrator"			VARCHAR (50),
	"totalusers"			INTEGER,
	"numberinstalls"			INTEGER,
	"accessversion"			VARCHAR (50),
	"targetstartdate"			TIMESTAMP WITHOUT TIME ZONE,
	"targetcompletiondate"			TIMESTAMP WITHOUT TIME ZONE,
	"trainingrequired"			BOOLEAN NOT NULL,
	"documentationrequired"			BOOLEAN NOT NULL,
	"userguide"			BOOLEAN NOT NULL,
	"databasepassword"			BOOLEAN NOT NULL,
	"encrypt"			BOOLEAN NOT NULL,
	"useraccounts"			BOOLEAN NOT NULL,
	"groupaccounts"			BOOLEAN NOT NULL,
	"betatesting"			BOOLEAN NOT NULL,
	"backupprocedure"			TEXT
);

-- CREATE INDEXES ...
CREATE INDEX "application_specifications_numberinstalls_idx" ON "application_specifications" ("numberinstalls");
ALTER TABLE "application_specifications" ADD CONSTRAINT "application_specifications_pkey" PRIMARY KEY ("specid");
CREATE INDEX "application_specifications_specid_idx" ON "application_specifications" ("specid");

CREATE TABLE IF NOT EXISTS "application_versions"
 (
	"versionid"			SERIAL,
	"versionnumber"			VARCHAR (50),
	"datechanged"			TIMESTAMP WITHOUT TIME ZONE,
	"requestedby"			VARCHAR (50),
	"authorizedby"			VARCHAR (50),
	"timeestimate"			TIMESTAMP WITHOUT TIME ZONE,
	"timeactual"			TIMESTAMP WITHOUT TIME ZONE,
	"changes"			TEXT
);

-- CREATE INDEXES ...
ALTER TABLE "application_versions" ADD CONSTRAINT "application_versions_pkey" PRIMARY KEY ("versionid");
CREATE INDEX "application_versions_versionid_idx" ON "application_versions" ("versionid");

CREATE TABLE IF NOT EXISTS "exchange_rates"
 (
	"exchangerateid"			SERIAL,
	"exchangerate"			NUMERIC(15,2) NOT NULL,
	"exchangeratestartdate"			TIMESTAMP WITHOUT TIME ZONE NOT NULL,
	"exchangerateenddate"			TIMESTAMP WITHOUT TIME ZONE NOT NULL,
	"exchangeratenotes"			TEXT,
	"exchangeratearchive"			BOOLEAN NOT NULL
);
COMMENT ON COLUMN "exchange_rates"."exchangerate" IS 'Exchange Rate';
COMMENT ON COLUMN "exchange_rates"."exchangeratestartdate" IS 'Date this Exchange Rate becomes effective (IE: Jun-29-2009)';
COMMENT ON COLUMN "exchange_rates"."exchangerateenddate" IS 'Date this Exchange Rate ceases (IE: Jun-29-2009)';
COMMENT ON COLUMN "exchange_rates"."exchangeratenotes" IS 'Exchange Rate Notes';
COMMENT ON COLUMN "exchange_rates"."exchangeratearchive" IS 'Archive this record?';

-- CREATE INDEXES ...
ALTER TABLE "exchange_rates" ADD CONSTRAINT "exchange_rates_pkey" PRIMARY KEY ("exchangerateid");

CREATE TABLE IF NOT EXISTS "guests"
 (
	"guestid"			SERIAL,
	"guestsalutation"			VARCHAR (25),
	"guestfirstname"			VARCHAR (25),
	"guestlastname"			VARCHAR (25) NOT NULL,
	"guestaddress"			VARCHAR (50),
	"guestcity"			VARCHAR (50),
	"guestregion"			VARCHAR (2),
	"guestcountry"			VARCHAR (3),
	"guestpczip"			VARCHAR (10),
	"guestprimaryphone"			VARCHAR (14),
	"guestprimaryphonetype"			VARCHAR (25),
	"guestsecondaryphone"			VARCHAR (14),
	"guestsecondaryphonetype"			VARCHAR (25),
	"guestemailaddress"			TEXT,
	"guestcompany"			VARCHAR (50),
	"guestvoid"			BOOLEAN NOT NULL,
	"guestnotes"			TEXT,
	"guestarchive"			BOOLEAN NOT NULL
);
COMMENT ON COLUMN "guests"."guestsalutation" IS 'Guest Salutation';
COMMENT ON COLUMN "guests"."guestfirstname" IS 'Guest First Name';
COMMENT ON COLUMN "guests"."guestlastname" IS 'Guest Last Name';
COMMENT ON COLUMN "guests"."guestaddress" IS 'Guest Address';
COMMENT ON COLUMN "guests"."guestcity" IS 'Guest City';
COMMENT ON COLUMN "guests"."guestregion" IS 'Guest Region';
COMMENT ON COLUMN "guests"."guestcountry" IS 'Guest Country';
COMMENT ON COLUMN "guests"."guestpczip" IS 'Guest Postal Code or Zip Code';
COMMENT ON COLUMN "guests"."guestprimaryphone" IS 'Guest Primary Contact Number';
COMMENT ON COLUMN "guests"."guestprimaryphonetype" IS 'Primary Contact Number Type';
COMMENT ON COLUMN "guests"."guestsecondaryphone" IS 'Guest Secondary (Backup) Contact Number';
COMMENT ON COLUMN "guests"."guestsecondaryphonetype" IS 'Secondary Contact Number Type';
COMMENT ON COLUMN "guests"."guestemailaddress" IS 'Guest Email Address';
COMMENT ON COLUMN "guests"."guestcompany" IS 'Employer of the Guest';
COMMENT ON COLUMN "guests"."guestvoid" IS 'Void this Guest record?';
COMMENT ON COLUMN "guests"."guestnotes" IS 'Guest Notes';
COMMENT ON COLUMN "guests"."guestarchive" IS 'Archive this record?';

-- CREATE INDEXES ...
ALTER TABLE "guests" ADD CONSTRAINT "guests_pkey" PRIMARY KEY ("guestid");

CREATE TABLE IF NOT EXISTS "housekeeping_notes"
 (
	"housekeepingnotesid"			SERIAL,
	"reservationguestid"			INTEGER NOT NULL,
	"hknotesdate"			TIMESTAMP WITHOUT TIME ZONE,
	"housekeepingnotes"			TEXT,
	"hkarchive"			BOOLEAN NOT NULL
);
COMMENT ON COLUMN "housekeeping_notes"."reservationguestid" IS 'Reservation/Guest';
COMMENT ON COLUMN "housekeeping_notes"."hknotesdate" IS 'Housekeeping Notes Date (IE: Jun-29-2009)';
COMMENT ON COLUMN "housekeeping_notes"."housekeepingnotes" IS 'Housekeeping Notes.  Any notes from ResGuest form that are specifically targeted at HK should be transferred to this field - IE: One bed per person.  Other notes can go here too - IE:  Arriving today.';
COMMENT ON COLUMN "housekeeping_notes"."hkarchive" IS 'Archive this record?';

-- CREATE INDEXES ...
ALTER TABLE "housekeeping_notes" ADD CONSTRAINT "housekeeping_notes_pkey" PRIMARY KEY ("housekeepingnotesid");
CREATE INDEX "housekeeping_notes_reservationguestid_idx" ON "housekeeping_notes" ("reservationguestid");

CREATE TABLE IF NOT EXISTS "housekeeping_notes_backup"
 (
	"housekeepingnotesid"			SERIAL,
	"reservationguestid"			INTEGER NOT NULL,
	"hknotesdate"			TIMESTAMP WITHOUT TIME ZONE,
	"housekeepingnotes"			TEXT,
	"hkarchive"			BOOLEAN NOT NULL
);
COMMENT ON COLUMN "housekeeping_notes_backup"."reservationguestid" IS 'Reservation/Guest';
COMMENT ON COLUMN "housekeeping_notes_backup"."hknotesdate" IS 'Housekeeping Notes Date (IE: Jun-29-2009)';
COMMENT ON COLUMN "housekeeping_notes_backup"."housekeepingnotes" IS 'Housekeeping Notes.  Any notes from ResGuest form that are specifically targeted at HK should be transferred to this field - IE: One bed per person.  Other notes can go here too - IE:  Arriving today.';
COMMENT ON COLUMN "housekeeping_notes_backup"."hkarchive" IS 'Archive this record?';

-- CREATE INDEXES ...
ALTER TABLE "housekeeping_notes_backup" ADD CONSTRAINT "housekeeping_notes_backup_pkey" PRIMARY KEY ("housekeepingnotesid");
CREATE INDEX "housekeeping_notes_backup_reservationguestid_idx" ON "housekeeping_notes_backup" ("reservationguestid");

CREATE TABLE IF NOT EXISTS "inventory_items"
 (
	"inventoryid"			SERIAL,
	-- Nullable: the Access source data contains items with no inventory type.
	"invtype"			VARCHAR (25),
	"invcode"			VARCHAR (5) NOT NULL,
	"invitemdescription"			VARCHAR (50),
	"invamount"			NUMERIC(15,2),
	"invgst"			BOOLEAN NOT NULL,
	"invpst"			BOOLEAN NOT NULL,
	"invhst"			BOOLEAN NOT NULL,
	"invlt"			BOOLEAN NOT NULL,
	"invrt"			BOOLEAN NOT NULL,
	"invht"			BOOLEAN NOT NULL,
	"invnotes"			TEXT,
	"invarchive"			BOOLEAN NOT NULL,
	"invdmt"			BOOLEAN NOT NULL
);
COMMENT ON COLUMN "inventory_items"."invtype" IS 'Inventory Type';
COMMENT ON COLUMN "inventory_items"."invcode" IS 'Inventory Code';
COMMENT ON COLUMN "inventory_items"."invitemdescription" IS 'Inventory Item Description.  Short version (IE:  Shuttle, T-Shirt, Extra Meal, Postage, Postage Reimbursed, Long Distance Calls).  If longer description needed, enter in Inventory notes.';
COMMENT ON COLUMN "inventory_items"."invamount" IS 'Price of Inventory Item';
COMMENT ON COLUMN "inventory_items"."invgst" IS 'GST';
COMMENT ON COLUMN "inventory_items"."invpst" IS 'PST';
COMMENT ON COLUMN "inventory_items"."invhst" IS 'HST';
COMMENT ON COLUMN "inventory_items"."invlt" IS 'Liquor Tax';
COMMENT ON COLUMN "inventory_items"."invrt" IS 'Room Tax';
COMMENT ON COLUMN "inventory_items"."invht" IS 'Hotel Tax';
COMMENT ON COLUMN "inventory_items"."invnotes" IS 'Inventory Notes';
COMMENT ON COLUMN "inventory_items"."invarchive" IS 'Archive this record';
COMMENT ON COLUMN "inventory_items"."invdmt" IS 'Destination Marketing Tax';

-- CREATE INDEXES ...
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("inventoryid");

CREATE TABLE IF NOT EXISTS "kitchen_meals"
 (
	"kitchenmealid"			SERIAL,
	"guestid"			INTEGER NOT NULL,
	"guestdiet"			VARCHAR (30),
	"kitchenmealnotes"			TEXT,
	"kmarchive"			BOOLEAN NOT NULL
);
COMMENT ON COLUMN "kitchen_meals"."kitchenmealid" IS 'Must have a separate record in this table for each guest requiring a special diet';
COMMENT ON COLUMN "kitchen_meals"."guestid" IS 'Guest';
COMMENT ON COLUMN "kitchen_meals"."guestdiet" IS 'Guest Diet (not limited to values in dropdown list)';
COMMENT ON COLUMN "kitchen_meals"."kitchenmealnotes" IS 'Kitchen/Meal Notes';
COMMENT ON COLUMN "kitchen_meals"."kmarchive" IS 'Archive this record?';

-- CREATE INDEXES ...
CREATE INDEX "kitchen_meals_guestid_idx" ON "kitchen_meals" ("guestid");
ALTER TABLE "kitchen_meals" ADD CONSTRAINT "kitchen_meals_pkey" PRIMARY KEY ("kitchenmealid");

CREATE TABLE IF NOT EXISTS "kitchen_meals_new"
 (
	"kitchenmealid"			SERIAL,
	"guestid"			INTEGER,
	"guestdiet"			VARCHAR (30),
	"kitchenmealnotes"			TEXT,
	"kmarchive"			BOOLEAN NOT NULL
);

-- CREATE INDEXES ...

CREATE TABLE IF NOT EXISTS "lookup_cities"
 (
	"city"			VARCHAR (50) NOT NULL
);

-- CREATE INDEXES ...
ALTER TABLE "lookup_cities" ADD CONSTRAINT "lookup_cities_pkey" PRIMARY KEY ("city");

CREATE TABLE IF NOT EXISTS "lookup_guest_diets"
 (
	"guestdiet"			VARCHAR (30) NOT NULL
);

-- CREATE INDEXES ...
ALTER TABLE "lookup_guest_diets" ADD CONSTRAINT "lookup_guest_diets_pkey" PRIMARY KEY ("guestdiet");

CREATE TABLE IF NOT EXISTS "lookup_inventory_codes"
 (
	"inventorycode"			VARCHAR (5) NOT NULL,
	"inventorycodedescription"			VARCHAR (30)
);

-- CREATE INDEXES ...
ALTER TABLE "lookup_inventory_codes" ADD CONSTRAINT "lookup_inventory_codes_pkey" PRIMARY KEY ("inventorycode");

CREATE TABLE IF NOT EXISTS "lookup_inventory_types"
 (
	"inventorytype"			VARCHAR (25) NOT NULL
);

-- CREATE INDEXES ...
ALTER TABLE "lookup_inventory_types" ADD CONSTRAINT "lookup_inventory_types_pkey" PRIMARY KEY ("inventorytype");

CREATE TABLE IF NOT EXISTS "lookup_payment_categories"
 (
	"paymentcategory"			VARCHAR (25) NOT NULL,
	"paymentcode"			VARCHAR (5),
	"paymentcategoryorder"			INTEGER
);

-- CREATE INDEXES ...
CREATE UNIQUE INDEX "lookup_payment_categories_paymentcode_idx" ON "lookup_payment_categories" ("paymentcode");
ALTER TABLE "lookup_payment_categories" ADD CONSTRAINT "lookup_payment_categories_pkey" PRIMARY KEY ("paymentcategory");

CREATE TABLE IF NOT EXISTS "lookup_payment_codes"
 (
	"paymentcode"			VARCHAR (5) NOT NULL,
	"paymentcodedescription"			VARCHAR (25)
);

-- CREATE INDEXES ...
ALTER TABLE "lookup_payment_codes" ADD CONSTRAINT "lookup_payment_codes_pkey" PRIMARY KEY ("paymentcode");

CREATE TABLE IF NOT EXISTS "lookup_payment_types"
 (
	"paymenttype"			VARCHAR (25) NOT NULL,
	"paymenttypeorder"			INTEGER
);

-- CREATE INDEXES ...
ALTER TABLE "lookup_payment_types" ADD CONSTRAINT "lookup_payment_types_pkey" PRIMARY KEY ("paymenttype");

CREATE TABLE IF NOT EXISTS "lookup_regions"
 (
	"regioncode"			VARCHAR (2) NOT NULL,
	"region"			VARCHAR (50),
	"country"			VARCHAR (150)
);

-- CREATE INDEXES ...
ALTER TABLE "lookup_regions" ADD CONSTRAINT "lookup_regions_pkey" PRIMARY KEY ("regioncode");

CREATE TABLE IF NOT EXISTS "lookup_room_rate_codes"
 (
	"roomratecode"			VARCHAR (5) NOT NULL,
	"roomratecodedescription"			VARCHAR (50)
);

-- CREATE INDEXES ...
ALTER TABLE "lookup_room_rate_codes" ADD CONSTRAINT "lookup_room_rate_codes_pkey" PRIMARY KEY ("roomratecode");

CREATE TABLE IF NOT EXISTS "lookup_room_rate_types"
 (
	"roomratetype"			VARCHAR (25) NOT NULL
);

-- CREATE INDEXES ...
ALTER TABLE "lookup_room_rate_types" ADD CONSTRAINT "lookup_room_rate_types_pkey" PRIMARY KEY ("roomratetype");

CREATE TABLE IF NOT EXISTS "lookup_room_types"
 (
	"roomtype"			VARCHAR (25) NOT NULL
);

-- CREATE INDEXES ...
ALTER TABLE "lookup_room_types" ADD CONSTRAINT "lookup_room_types_pkey" PRIMARY KEY ("roomtype");

CREATE TABLE IF NOT EXISTS "lookup_salutations"
 (
	"salutation"			VARCHAR (25) NOT NULL
);

-- CREATE INDEXES ...
ALTER TABLE "lookup_salutations" ADD CONSTRAINT "lookup_salutations_pkey" PRIMARY KEY ("salutation");

CREATE TABLE IF NOT EXISTS "lookup_shuttle_sites"
 (
	"shuttlesite"			VARCHAR (15) NOT NULL,
	"shuttlesitedescription"			VARCHAR (25)
);

-- CREATE INDEXES ...
ALTER TABLE "lookup_shuttle_sites" ADD CONSTRAINT "lookup_shuttle_sites_pkey" PRIMARY KEY ("shuttlesite");

CREATE TABLE IF NOT EXISTS "lookup_tax_rate_types"
 (
	"taxratetype"			VARCHAR (25) NOT NULL
);

-- CREATE INDEXES ...
ALTER TABLE "lookup_tax_rate_types" ADD CONSTRAINT "lookup_tax_rate_types_pkey" PRIMARY KEY ("taxratetype");

CREATE TABLE IF NOT EXISTS "lookup_users"
 (
	"userid"			SERIAL,
	"userinitials"			VARCHAR (3) NOT NULL,
	"userlastname"			VARCHAR (25),
	"userfirstname"			VARCHAR (25),
	"useriscurrent"			BOOLEAN NOT NULL,
	"usernotes"			TEXT,
	"userarchive"			BOOLEAN NOT NULL
);
COMMENT ON COLUMN "lookup_users"."userinitials" IS 'User Initials';
COMMENT ON COLUMN "lookup_users"."userlastname" IS 'User Last Name';
COMMENT ON COLUMN "lookup_users"."userfirstname" IS 'User First Name';
COMMENT ON COLUMN "lookup_users"."useriscurrent" IS 'Is this User current?';
COMMENT ON COLUMN "lookup_users"."usernotes" IS 'User Notes';
COMMENT ON COLUMN "lookup_users"."userarchive" IS 'Archive this record?';

-- CREATE INDEXES ...
ALTER TABLE "lookup_users" ADD CONSTRAINT "lookup_users_pkey" PRIMARY KEY ("userid");
CREATE INDEX "lookup_users_userid_idx" ON "lookup_users" ("userid");
CREATE UNIQUE INDEX "lookup_users_userinitials_idx" ON "lookup_users" ("userinitials");

CREATE TABLE IF NOT EXISTS "mailouts"
 (
	"guest"			VARCHAR (255),
	"guestaddress"			VARCHAR (50),
	"cityregioncountry"			VARCHAR (255),
	"guestpczip"			VARCHAR (10),
	"guestprimaryphone"			VARCHAR (14),
	"resnumber"			INTEGER,
	"resarrivaldate"			TIMESTAMP WITHOUT TIME ZONE,
	"resdeparturedate"			TIMESTAMP WITHOUT TIME ZONE,
	"resno"			VARCHAR (255),
	"arrival"			VARCHAR (255),
	"departure"			VARCHAR (255),
	"resdateconfirmed"			TIMESTAMP WITHOUT TIME ZONE,
	"rdc"			VARCHAR (255),
	"rescancelled"			BOOLEAN NOT NULL,
	"roomid"			INTEGER
);

-- CREATE INDEXES ...

CREATE TABLE IF NOT EXISTS "room_assignments"
 (
	"occupancyid"			SERIAL,
	"reservationguestid"			INTEGER NOT NULL,
	"roomid"			INTEGER NOT NULL,
	"occupancyin"			TIMESTAMP WITHOUT TIME ZONE NOT NULL,
	"occupancyout"			TIMESTAMP WITHOUT TIME ZONE NOT NULL,
	"occupancynumguests"			INTEGER,
	"occupancynotes"			TEXT,
	"occupancyarchive"			BOOLEAN NOT NULL
);
COMMENT ON COLUMN "room_assignments"."reservationguestid" IS 'Reservation/Guest';
COMMENT ON COLUMN "room_assignments"."roomid" IS 'Select Room from dropdown list';
COMMENT ON COLUMN "room_assignments"."occupancyin" IS 'Date occupancy in this room starts (IE: Jun-29-2009)';
COMMENT ON COLUMN "room_assignments"."occupancyout" IS 'Date occupancy in this room ends (IE: Jun-29-2009)';
COMMENT ON COLUMN "room_assignments"."occupancynumguests" IS 'Number of Guests staying in this room';
COMMENT ON COLUMN "room_assignments"."occupancynotes" IS 'Occupancy Notes';
COMMENT ON COLUMN "room_assignments"."occupancyarchive" IS 'Archive this record?';

-- CREATE INDEXES ...
ALTER TABLE "room_assignments" ADD CONSTRAINT "room_assignments_pkey" PRIMARY KEY ("occupancyid");
CREATE INDEX "room_assignments_reservationid_idx" ON "room_assignments" ("reservationguestid");
CREATE INDEX "room_assignments_roomid_idx" ON "room_assignments" ("roomid");

CREATE TABLE IF NOT EXISTS "room_assignments_backup"
 (
	"occupancyid"			SERIAL,
	"reservationguestid"			INTEGER NOT NULL,
	"roomid"			INTEGER NOT NULL,
	"occupancyin"			TIMESTAMP WITHOUT TIME ZONE NOT NULL,
	"occupancyout"			TIMESTAMP WITHOUT TIME ZONE NOT NULL,
	"occupancynumguests"			INTEGER,
	"occupancynotes"			TEXT,
	"occupancyarchive"			BOOLEAN NOT NULL
);
COMMENT ON COLUMN "room_assignments_backup"."reservationguestid" IS 'Reservation/Guest';
COMMENT ON COLUMN "room_assignments_backup"."roomid" IS 'Select Room from dropdown list';
COMMENT ON COLUMN "room_assignments_backup"."occupancyin" IS 'Date occupancy in this room starts (IE: Jun-29-2009)';
COMMENT ON COLUMN "room_assignments_backup"."occupancyout" IS 'Date occupancy in this room ends (IE: Jun-29-2009)';
COMMENT ON COLUMN "room_assignments_backup"."occupancynumguests" IS 'Number of Guests staying in this room';
COMMENT ON COLUMN "room_assignments_backup"."occupancynotes" IS 'Occupancy Notes';
COMMENT ON COLUMN "room_assignments_backup"."occupancyarchive" IS 'Archive this record?';

-- CREATE INDEXES ...
ALTER TABLE "room_assignments_backup" ADD CONSTRAINT "room_assignments_backup_pkey" PRIMARY KEY ("occupancyid");
CREATE INDEX "room_assignments_backup_reservationid_idx" ON "room_assignments_backup" ("reservationguestid");
CREATE INDEX "room_assignments_backup_roomid_idx" ON "room_assignments_backup" ("roomid");

CREATE TABLE IF NOT EXISTS "payments"
 (
	"paymentid"			SERIAL,
	"reservationguestid"			INTEGER NOT NULL,
	"paymentcode"			VARCHAR (5) NOT NULL,
	"paymentcategory"			VARCHAR (25) NOT NULL,
	"paymenttype"			VARCHAR (25) NOT NULL,
	"paymentdate"			TIMESTAMP WITHOUT TIME ZONE,
	"paymentamount"			NUMERIC(15,2),
	"paymentcurrency"			VARCHAR (15) NOT NULL,
	"ccname"			VARCHAR (50),
	"paymentamountcdn"			NUMERIC(15,2),
	"ccnumber"			VARCHAR (25),
	"ccexpdate"			TIMESTAMP WITHOUT TIME ZONE,
	"ccnotes"			TEXT,
	"paymentnotes"			TEXT,
	"paymentarchive"			BOOLEAN NOT NULL
);
COMMENT ON COLUMN "payments"."reservationguestid" IS 'Registration/Guest';
COMMENT ON COLUMN "payments"."paymentcode" IS 'Payment Code';
COMMENT ON COLUMN "payments"."paymentcategory" IS 'Payment Category';
COMMENT ON COLUMN "payments"."paymenttype" IS 'Payment Type';
COMMENT ON COLUMN "payments"."paymentdate" IS 'Payment Date (IE: Jun-29-2009)';
COMMENT ON COLUMN "payments"."paymentamount" IS 'Amount of payment.  Can be positive or negative.';
COMMENT ON COLUMN "payments"."paymentcurrency" IS 'Payment currency.  Canadian dollars or US dollars.';
COMMENT ON COLUMN "payments"."ccname" IS 'Single field for name as it appears on credit card.';
COMMENT ON COLUMN "payments"."paymentamountcdn" IS 'Automatically generated field - if payment in US, db does conversion to Cdn, and updates this field.  If payment in Cdn, db transfers amount from PaymentAmount to this field.';
COMMENT ON COLUMN "payments"."ccnumber" IS 'Credit card number';
COMMENT ON COLUMN "payments"."ccexpdate" IS 'Credit card expiry date (mm-yy)';
COMMENT ON COLUMN "payments"."ccnotes" IS 'Credit card notes';
COMMENT ON COLUMN "payments"."paymentnotes" IS 'Payment notes';
COMMENT ON COLUMN "payments"."paymentarchive" IS 'Archive this record?';

-- CREATE INDEXES ...
ALTER TABLE "payments" ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("paymentid");
CREATE INDEX "payments_registrationguestid_idx" ON "payments" ("reservationguestid");

CREATE TABLE IF NOT EXISTS "payments_backup"
 (
	"paymentid"			SERIAL,
	"reservationguestid"			INTEGER NOT NULL,
	"paymentcode"			VARCHAR (5) NOT NULL,
	"paymentcategory"			VARCHAR (25) NOT NULL,
	"paymenttype"			VARCHAR (25) NOT NULL,
	"paymentdate"			TIMESTAMP WITHOUT TIME ZONE,
	"paymentamount"			NUMERIC(15,2),
	"paymentcurrency"			VARCHAR (15) NOT NULL,
	"ccname"			VARCHAR (50),
	"paymentamountcdn"			NUMERIC(15,2),
	"ccnumber"			VARCHAR (25),
	"ccexpdate"			TIMESTAMP WITHOUT TIME ZONE,
	"ccnotes"			TEXT,
	"paymentnotes"			TEXT,
	"paymentarchive"			BOOLEAN NOT NULL
);
COMMENT ON COLUMN "payments_backup"."reservationguestid" IS 'Registration/Guest';
COMMENT ON COLUMN "payments_backup"."paymentcode" IS 'Payment Code';
COMMENT ON COLUMN "payments_backup"."paymentcategory" IS 'Payment Category';
COMMENT ON COLUMN "payments_backup"."paymenttype" IS 'Payment Type';
COMMENT ON COLUMN "payments_backup"."paymentdate" IS 'Payment Date (IE: Jun-29-2009)';
COMMENT ON COLUMN "payments_backup"."paymentamount" IS 'Amount of payment.  Can be positive or negative.';
COMMENT ON COLUMN "payments_backup"."paymentcurrency" IS 'Payment currency.  Canadian dollars or US dollars.';
COMMENT ON COLUMN "payments_backup"."ccname" IS 'Single field for name as it appears on credit card.';
COMMENT ON COLUMN "payments_backup"."paymentamountcdn" IS 'Automatically generated field - if payment in US, db does conversion to Cdn, and updates this field.  If payment in Cdn, db transfers amount from PaymentAmount to this field.';
COMMENT ON COLUMN "payments_backup"."ccnumber" IS 'Credit card number';
COMMENT ON COLUMN "payments_backup"."ccexpdate" IS 'Credit card expiry date (mm-yy)';
COMMENT ON COLUMN "payments_backup"."ccnotes" IS 'Credit card notes';
COMMENT ON COLUMN "payments_backup"."paymentnotes" IS 'Payment notes';
COMMENT ON COLUMN "payments_backup"."paymentarchive" IS 'Archive this record?';

-- CREATE INDEXES ...
ALTER TABLE "payments_backup" ADD CONSTRAINT "payments_backup_pkey" PRIMARY KEY ("paymentid");
CREATE INDEX "payments_backup_registrationguestid_idx" ON "payments_backup" ("reservationguestid");

CREATE TABLE IF NOT EXISTS "payment_type_zero"
 (
	"paymenttype"			VARCHAR (25) NOT NULL,
	"paymentamount"			NUMERIC(15,2),
	"paymentcurrency"			VARCHAR (15) NOT NULL
);
COMMENT ON COLUMN "payment_type_zero"."paymenttype" IS 'Payment Type';
COMMENT ON COLUMN "payment_type_zero"."paymentamount" IS 'Amount of payment.  Can be positive or negative.';
COMMENT ON COLUMN "payment_type_zero"."paymentcurrency" IS 'Payment currency.  Canadian dollars or US dollars.';

-- CREATE INDEXES ...

CREATE TABLE IF NOT EXISTS "payment_zero"
 (
	"paymentcode"			VARCHAR (5) NOT NULL,
	"paymentcategory"			VARCHAR (25) NOT NULL,
	"paymentamount"			NUMERIC(15,2),
	"paymentcurrency"			VARCHAR (15) NOT NULL
);
COMMENT ON COLUMN "payment_zero"."paymentcode" IS 'Payment Code';
COMMENT ON COLUMN "payment_zero"."paymentcategory" IS 'Payment Category';
COMMENT ON COLUMN "payment_zero"."paymentamount" IS 'Amount of payment.  Can be positive or negative.';
COMMENT ON COLUMN "payment_zero"."paymentcurrency" IS 'Payment currency.  Canadian dollars or US dollars.';

-- CREATE INDEXES ...

CREATE TABLE IF NOT EXISTS "reservation_board"
 (
	"room"			VARCHAR (255),
	"guest"			VARCHAR (255),
	"nightofstay"			TIMESTAMP WITHOUT TIME ZONE
);

-- CREATE INDEXES ...

CREATE TABLE IF NOT EXISTS "reservations"
 (
	"reservationid"			SERIAL,
	"resnumber"			INTEGER NOT NULL,
	"resbookingdate"			TIMESTAMP WITHOUT TIME ZONE,
	"resbookedby"			VARCHAR (3) NOT NULL,
	"resgroupname"			VARCHAR (50),
	"resarrivaldate"			TIMESTAMP WITHOUT TIME ZONE NOT NULL,
	"resdeparturedate"			TIMESTAMP WITHOUT TIME ZONE NOT NULL,
	"numnights"			INTEGER,
	"numrooms"			INTEGER NOT NULL,
	"numadults"			INTEGER NOT NULL,
	"numchildren"			INTEGER,
	"resconfirmed"			BOOLEAN NOT NULL,
	"resdateconfirmed"			TIMESTAMP WITHOUT TIME ZONE,
	"rescancelled"			BOOLEAN NOT NULL,
	"resdatecancelled"			TIMESTAMP WITHOUT TIME ZONE,
	"resnotes"			TEXT,
	"resarchive"			BOOLEAN NOT NULL,
	"resarrivaltime"			VARCHAR (15),
	"bedtype"			VARCHAR (10)
);
COMMENT ON COLUMN "reservations"."resnumber" IS 'In house reservation number';
COMMENT ON COLUMN "reservations"."resbookingdate" IS 'Date reservation booked  (IE: Jun-29-2009)';
COMMENT ON COLUMN "reservations"."resbookedby" IS 'User who booked the reservation';
COMMENT ON COLUMN "reservations"."resgroupname" IS 'Reservation Group Name';
COMMENT ON COLUMN "reservations"."resarrivaldate" IS 'Arrival Date  (IE: Jun-29-2009)';
COMMENT ON COLUMN "reservations"."resdeparturedate" IS 'Departure Date  (IE: Jun-29-2009)';
COMMENT ON COLUMN "reservations"."numnights" IS 'Automatic entry.  Number of nights party is staying';
COMMENT ON COLUMN "reservations"."numrooms" IS 'Number of rooms for this reservation';
COMMENT ON COLUMN "reservations"."numadults" IS 'Number of adults for this reservation';
COMMENT ON COLUMN "reservations"."numchildren" IS 'Number of children for this reservation';
COMMENT ON COLUMN "reservations"."resconfirmed" IS 'Has reservation been confirmed?';
COMMENT ON COLUMN "reservations"."resdateconfirmed" IS 'Date reservation was confirmed  (IE: Jun-29-2009)';
COMMENT ON COLUMN "reservations"."rescancelled" IS 'Has reservation been cancelled?';
COMMENT ON COLUMN "reservations"."resdatecancelled" IS 'Date reservation was cancelled  (IE: Jun-29-2009)';
COMMENT ON COLUMN "reservations"."resnotes" IS 'Reservation Notes';
COMMENT ON COLUMN "reservations"."resarchive" IS 'Archive this record?';
COMMENT ON COLUMN "reservations"."resarrivaltime" IS 'Approx arrival time of guest.  Needed by Kitchen.';
COMMENT ON COLUMN "reservations"."bedtype" IS 'Bed Type is always either Double or Twin.  Needed by Housekeeping staff.';

-- CREATE INDEXES ...
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_pkey" PRIMARY KEY ("reservationid");
CREATE UNIQUE INDEX "reservations_resnumber_idx" ON "reservations" ("resnumber");

CREATE TABLE IF NOT EXISTS "reservations_backup"
 (
	"reservationid"			SERIAL,
	"resnumber"			INTEGER NOT NULL,
	"resbookingdate"			TIMESTAMP WITHOUT TIME ZONE,
	"resbookedby"			VARCHAR (3) NOT NULL,
	"resgroupname"			VARCHAR (50),
	"resarrivaldate"			TIMESTAMP WITHOUT TIME ZONE NOT NULL,
	"resdeparturedate"			TIMESTAMP WITHOUT TIME ZONE NOT NULL,
	"numnights"			INTEGER,
	"numrooms"			INTEGER NOT NULL,
	"numadults"			INTEGER NOT NULL,
	"numchildren"			INTEGER,
	"resconfirmed"			BOOLEAN NOT NULL,
	"resdateconfirmed"			TIMESTAMP WITHOUT TIME ZONE,
	"rescancelled"			BOOLEAN NOT NULL,
	"resdatecancelled"			TIMESTAMP WITHOUT TIME ZONE,
	"resnotes"			TEXT,
	"resarchive"			BOOLEAN NOT NULL,
	"resarrivaltime"			VARCHAR (15),
	"bedtype"			VARCHAR (10)
);
COMMENT ON COLUMN "reservations_backup"."resnumber" IS 'In house reservation number';
COMMENT ON COLUMN "reservations_backup"."resbookingdate" IS 'Date reservation booked  (IE: Jun-29-2009)';
COMMENT ON COLUMN "reservations_backup"."resbookedby" IS 'User who booked the reservation';
COMMENT ON COLUMN "reservations_backup"."resgroupname" IS 'Reservation Group Name';
COMMENT ON COLUMN "reservations_backup"."resarrivaldate" IS 'Arrival Date  (IE: Jun-29-2009)';
COMMENT ON COLUMN "reservations_backup"."resdeparturedate" IS 'Departure Date  (IE: Jun-29-2009)';
COMMENT ON COLUMN "reservations_backup"."numnights" IS 'Automatic entry.  Number of nights party is staying';
COMMENT ON COLUMN "reservations_backup"."numrooms" IS 'Number of rooms for this reservation';
COMMENT ON COLUMN "reservations_backup"."numadults" IS 'Number of adults for this reservation';
COMMENT ON COLUMN "reservations_backup"."numchildren" IS 'Number of children for this reservation';
COMMENT ON COLUMN "reservations_backup"."resconfirmed" IS 'Has reservation been confirmed?';
COMMENT ON COLUMN "reservations_backup"."resdateconfirmed" IS 'Date reservation was confirmed  (IE: Jun-29-2009)';
COMMENT ON COLUMN "reservations_backup"."rescancelled" IS 'Has reservation been cancelled?';
COMMENT ON COLUMN "reservations_backup"."resdatecancelled" IS 'Date reservation was cancelled  (IE: Jun-29-2009)';
COMMENT ON COLUMN "reservations_backup"."resnotes" IS 'Reservation Notes';
COMMENT ON COLUMN "reservations_backup"."resarchive" IS 'Archive this record?';
COMMENT ON COLUMN "reservations_backup"."resarrivaltime" IS 'Approx arrival time of guest.  Needed by Kitchen.';
COMMENT ON COLUMN "reservations_backup"."bedtype" IS 'Bed Type is always either Double or Twin.  Needed by Housekeeping staff.';

-- CREATE INDEXES ...
ALTER TABLE "reservations_backup" ADD CONSTRAINT "reservations_backup_pkey" PRIMARY KEY ("reservationid");
CREATE UNIQUE INDEX "reservations_backup_resnumber_idx" ON "reservations_backup" ("resnumber");

CREATE TABLE IF NOT EXISTS "reservation_guests"
 (
	"reservationguestid"			SERIAL,
	"reservationid"			INTEGER NOT NULL,
	"guestid"			INTEGER NOT NULL,
	"primaryguest"			BOOLEAN NOT NULL,
	"checkindate"			TIMESTAMP WITHOUT TIME ZONE NOT NULL,
	"checkintime"			TIMESTAMP WITHOUT TIME ZONE,
	"checkoutdate"			TIMESTAMP WITHOUT TIME ZONE NOT NULL,
	"checkouttime"			TIMESTAMP WITHOUT TIME ZONE,
	"guestinhouse"			BOOLEAN NOT NULL,
	"percentageofbill"			INTEGER NOT NULL,
	"vehicledescription"			VARCHAR (100),
	"vehiclelicenseplate"			VARCHAR (10),
	"rgnotes"			TEXT,
	"rgarchive"			BOOLEAN NOT NULL
);
COMMENT ON COLUMN "reservation_guests"."reservationid" IS 'Reservation Number';
COMMENT ON COLUMN "reservation_guests"."guestid" IS 'Guest Name';
COMMENT ON COLUMN "reservation_guests"."primaryguest" IS 'Is this Guest the "primary guest" for this reservation?';
COMMENT ON COLUMN "reservation_guests"."checkindate" IS 'Check In Date  (IE: Jun-29-2009)';
COMMENT ON COLUMN "reservation_guests"."checkintime" IS 'Check In Time (IE: 6:30 PM).  If Guest suggests an arrival time, enter here, rather than entering a note (IE: "note on arrival - after lunch")';
COMMENT ON COLUMN "reservation_guests"."checkoutdate" IS 'Check Out Date  (IE: Jun-29-2009)';
COMMENT ON COLUMN "reservation_guests"."checkouttime" IS 'Check Out Time';
COMMENT ON COLUMN "reservation_guests"."guestinhouse" IS 'When Guest has actually arrived on premises and has checked in, check this box to indicate Guest is now "in house"';
COMMENT ON COLUMN "reservation_guests"."percentageofbill" IS 'Percentage of bill this Guest will be paying';
COMMENT ON COLUMN "reservation_guests"."vehicledescription" IS 'Description of Guest vehicle';
COMMENT ON COLUMN "reservation_guests"."vehiclelicenseplate" IS 'Guest vehicle license plate number';
COMMENT ON COLUMN "reservation_guests"."rgnotes" IS 'Enter notes about this Res/Guest combo (IE: 1 bed per person) so data is avail for Room assignment.  This field will not show on HK rpt, but will show on In-House rpt.';
COMMENT ON COLUMN "reservation_guests"."rgarchive" IS 'Archive this record?';

-- CREATE INDEXES ...
CREATE INDEX "reservation_guests_guestid_idx" ON "reservation_guests" ("guestid");
ALTER TABLE "reservation_guests" ADD CONSTRAINT "reservation_guests_pkey" PRIMARY KEY ("reservationguestid");
CREATE INDEX "reservation_guests_reservationid_idx" ON "reservation_guests" ("reservationid");

CREATE TABLE IF NOT EXISTS "reservation_guests_backup"
 (
	"reservationguestid"			SERIAL,
	"reservationid"			INTEGER NOT NULL,
	"guestid"			INTEGER NOT NULL,
	"primaryguest"			BOOLEAN NOT NULL,
	"checkindate"			TIMESTAMP WITHOUT TIME ZONE NOT NULL,
	"checkintime"			TIMESTAMP WITHOUT TIME ZONE,
	"checkoutdate"			TIMESTAMP WITHOUT TIME ZONE NOT NULL,
	"checkouttime"			TIMESTAMP WITHOUT TIME ZONE,
	"guestinhouse"			BOOLEAN NOT NULL,
	"percentageofbill"			INTEGER NOT NULL,
	"vehicledescription"			VARCHAR (100),
	"vehiclelicenseplate"			VARCHAR (10),
	"rgnotes"			TEXT,
	"rgarchive"			BOOLEAN NOT NULL
);
COMMENT ON COLUMN "reservation_guests_backup"."reservationid" IS 'Reservation Number';
COMMENT ON COLUMN "reservation_guests_backup"."guestid" IS 'Guest Name';
COMMENT ON COLUMN "reservation_guests_backup"."primaryguest" IS 'Is this Guest the "primary guest" for this reservation?';
COMMENT ON COLUMN "reservation_guests_backup"."checkindate" IS 'Check In Date  (IE: Jun-29-2009)';
COMMENT ON COLUMN "reservation_guests_backup"."checkintime" IS 'Check In Time (IE: 6:30 PM).  If Guest suggests an arrival time, enter here, rather than entering a note (IE: "note on arrival - after lunch")';
COMMENT ON COLUMN "reservation_guests_backup"."checkoutdate" IS 'Check Out Date  (IE: Jun-29-2009)';
COMMENT ON COLUMN "reservation_guests_backup"."checkouttime" IS 'Check Out Time';
COMMENT ON COLUMN "reservation_guests_backup"."guestinhouse" IS 'When Guest has actually arrived on premises and has checked in, check this box to indicate Guest is now "in house"';
COMMENT ON COLUMN "reservation_guests_backup"."percentageofbill" IS 'Percentage of bill this Guest will be paying';
COMMENT ON COLUMN "reservation_guests_backup"."vehicledescription" IS 'Description of Guest vehicle';
COMMENT ON COLUMN "reservation_guests_backup"."vehiclelicenseplate" IS 'Guest vehicle license plate number';
COMMENT ON COLUMN "reservation_guests_backup"."rgnotes" IS 'Enter notes about this Res/Guest combo (IE: 1 bed per person) so data is avail for Room assignment.  This field will not show on HK rpt, but will show on In-House rpt.';
COMMENT ON COLUMN "reservation_guests_backup"."rgarchive" IS 'Archive this record?';

-- CREATE INDEXES ...
CREATE INDEX "reservation_guests_backup_guestid_idx" ON "reservation_guests_backup" ("guestid");
ALTER TABLE "reservation_guests_backup" ADD CONSTRAINT "reservation_guests_backup_pkey" PRIMARY KEY ("reservationguestid");
CREATE INDEX "reservation_guests_backup_reservationid_idx" ON "reservation_guests_backup" ("reservationid");

CREATE TABLE IF NOT EXISTS "rooms"
 (
	"roomid"			SERIAL,
	"roomnumber"			VARCHAR (5),
	"roomname"			VARCHAR (25),
	"roomtype"			VARCHAR (25),
	"roomcode"			VARCHAR (3),
	"roomshorthand"			VARCHAR (10),
	"roomgst"			BOOLEAN NOT NULL,
	"roompst"			BOOLEAN NOT NULL,
	"roomhst"			BOOLEAN NOT NULL,
	"roomrt"			BOOLEAN NOT NULL,
	"roomht"			BOOLEAN NOT NULL,
	"roomnotes"			TEXT,
	"roomarchive"			BOOLEAN NOT NULL,
	"roomorder"			REAL,
	"roomdmt"			BOOLEAN NOT NULL
);
COMMENT ON COLUMN "rooms"."roomnumber" IS 'Room Number';
COMMENT ON COLUMN "rooms"."roomname" IS 'Room Name.  If Room has unique name, enter it.  Otherwise, enter building name (IE:  Lodge, Victoria Cottage, etc.)';
COMMENT ON COLUMN "rooms"."roomtype" IS 'Room Type';
COMMENT ON COLUMN "rooms"."roomcode" IS 'Room Code';
COMMENT ON COLUMN "rooms"."roomshorthand" IS 'Room Shorthand';
COMMENT ON COLUMN "rooms"."roomgst" IS 'GST';
COMMENT ON COLUMN "rooms"."roompst" IS 'PST';
COMMENT ON COLUMN "rooms"."roomhst" IS 'HST';
COMMENT ON COLUMN "rooms"."roomrt" IS 'Room Tax';
COMMENT ON COLUMN "rooms"."roomht" IS 'Hotel Tax';
COMMENT ON COLUMN "rooms"."roomnotes" IS 'Room Notes';
COMMENT ON COLUMN "rooms"."roomarchive" IS 'Archive this record?';
COMMENT ON COLUMN "rooms"."roomorder" IS 'Custom sort order';
COMMENT ON COLUMN "rooms"."roomdmt" IS 'Destination Marketing Tax';

-- CREATE INDEXES ...
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_pkey" PRIMARY KEY ("roomid");
CREATE INDEX "rooms_roomid_idx" ON "rooms" ("roomid");

CREATE TABLE IF NOT EXISTS "room_rates"
 (
	"roomrateid"			SERIAL,
	"roomid"			INTEGER NOT NULL,
	"roomratetype"			VARCHAR (25),
	"roomratecode"			VARCHAR (5) NOT NULL,
	"roomrateadditionalfactor"			VARCHAR (50),
	"roomrate"			NUMERIC(15,2) NOT NULL,
	"roomratestartdate"			TIMESTAMP WITHOUT TIME ZONE NOT NULL,
	"roomrateenddate"			TIMESTAMP WITHOUT TIME ZONE NOT NULL,
	"roomratenotes"			TEXT,
	"roomratearchive"			BOOLEAN NOT NULL
);
COMMENT ON COLUMN "room_rates"."roomid" IS 'Room';
COMMENT ON COLUMN "room_rates"."roomratetype" IS 'Room Rate Type';
COMMENT ON COLUMN "room_rates"."roomratecode" IS 'Room Rate Code';
COMMENT ON COLUMN "room_rates"."roomrateadditionalfactor" IS 'Room Rate - Additional Factor';
COMMENT ON COLUMN "room_rates"."roomrate" IS 'Room Rate';
COMMENT ON COLUMN "room_rates"."roomratestartdate" IS 'Date this Room Rate becomes applicable (IE: Jun-29-2009)';
COMMENT ON COLUMN "room_rates"."roomrateenddate" IS 'Date this Room Rate ceases (IE: Jun-29-2009)';
COMMENT ON COLUMN "room_rates"."roomratenotes" IS 'Room Rate Notes';
COMMENT ON COLUMN "room_rates"."roomratearchive" IS 'Archive this record?';

-- CREATE INDEXES ...
ALTER TABLE "room_rates" ADD CONSTRAINT "room_rates_pkey" PRIMARY KEY ("roomrateid");
CREATE INDEX "room_rates_roomid_idx" ON "room_rates" ("roomid");

CREATE TABLE IF NOT EXISTS "room_rates_new"
 (
	"roomrateid"			SERIAL,
	"roomid"			INTEGER NOT NULL,
	"roomratetype"			VARCHAR (25),
	"roomratecode"			VARCHAR (5) NOT NULL,
	"roomrateadditionalfactor"			VARCHAR (50),
	"roomrate"			NUMERIC(15,2) NOT NULL,
	"roomratestartdate"			TIMESTAMP WITHOUT TIME ZONE NOT NULL,
	"roomrateenddate"			TIMESTAMP WITHOUT TIME ZONE NOT NULL,
	"roomratenotes"			TEXT,
	"roomratearchive"			BOOLEAN NOT NULL
);
COMMENT ON COLUMN "room_rates_new"."roomid" IS 'Room';
COMMENT ON COLUMN "room_rates_new"."roomratetype" IS 'Room Rate Type';
COMMENT ON COLUMN "room_rates_new"."roomratecode" IS 'Room Rate Code';
COMMENT ON COLUMN "room_rates_new"."roomrateadditionalfactor" IS 'Room Rate - Additional Factor';
COMMENT ON COLUMN "room_rates_new"."roomrate" IS 'Room Rate';
COMMENT ON COLUMN "room_rates_new"."roomratestartdate" IS 'Date this Room Rate becomes applicable (IE: Jun-29-2009)';
COMMENT ON COLUMN "room_rates_new"."roomrateenddate" IS 'Date this Room Rate ceases (IE: Jun-29-2009)';
COMMENT ON COLUMN "room_rates_new"."roomratenotes" IS 'Room Rate Notes';
COMMENT ON COLUMN "room_rates_new"."roomratearchive" IS 'Archive this record?';

-- CREATE INDEXES ...
ALTER TABLE "room_rates_new" ADD CONSTRAINT "room_rates_new_pkey" PRIMARY KEY ("roomrateid");
CREATE INDEX "room_rates_new_roomid_idx" ON "room_rates_new" ("roomid");

CREATE TABLE IF NOT EXISTS "shuttles"
 (
	"shuttletripid"			SERIAL,
	"reservationguestid"			INTEGER NOT NULL,
	"pickupsite"			VARCHAR (15),
	"pickupdate"			TIMESTAMP WITHOUT TIME ZONE,
	"pickuptime"			TIMESTAMP WITHOUT TIME ZONE,
	"dropoffsite"			VARCHAR (15),
	"dropoffdate"			TIMESTAMP WITHOUT TIME ZONE,
	"dropofftime"			TIMESTAMP WITHOUT TIME ZONE,
	"shuttlenumguests"			INTEGER,
	"shuttlenotes"			TEXT,
	"shuttlearchive"			BOOLEAN NOT NULL
);
COMMENT ON COLUMN "shuttles"."reservationguestid" IS 'Reservation/Guest';
COMMENT ON COLUMN "shuttles"."pickupsite" IS 'Pickup Site';
COMMENT ON COLUMN "shuttles"."pickupdate" IS 'Pickup Date (IE: Jun-29-2009)';
COMMENT ON COLUMN "shuttles"."pickuptime" IS 'Pickup Time';
COMMENT ON COLUMN "shuttles"."dropoffsite" IS 'Dropoff Site';
COMMENT ON COLUMN "shuttles"."dropoffdate" IS 'Dropoff Date (IE: Jun-29-2009)';
COMMENT ON COLUMN "shuttles"."dropofftime" IS 'Dropoff Time';
COMMENT ON COLUMN "shuttles"."shuttlenumguests" IS 'Number of Guests to be picked up/dropped off';
COMMENT ON COLUMN "shuttles"."shuttlenotes" IS 'Shuttle Notes';
COMMENT ON COLUMN "shuttles"."shuttlearchive" IS 'Archive this record?';

-- CREATE INDEXES ...
CREATE INDEX "shuttles_guestid_idx" ON "shuttles" ("reservationguestid");
ALTER TABLE "shuttles" ADD CONSTRAINT "shuttles_pkey" PRIMARY KEY ("shuttletripid");

CREATE TABLE IF NOT EXISTS "tax_rates"
 (
	"taxrateid"			SERIAL,
	"taxratetype"			VARCHAR (25) NOT NULL,
	"taxrate"			DOUBLE PRECISION NOT NULL,
	"taxratestartdate"			TIMESTAMP WITHOUT TIME ZONE NOT NULL,
	"taxrateenddate"			TIMESTAMP WITHOUT TIME ZONE NOT NULL,
	"taxratenotes"			TEXT,
	"taxratearchive"			BOOLEAN NOT NULL
);
COMMENT ON COLUMN "tax_rates"."taxratetype" IS 'Tax Rate Type';
COMMENT ON COLUMN "tax_rates"."taxrate" IS 'Tax Rate (Percentage)';
COMMENT ON COLUMN "tax_rates"."taxratestartdate" IS 'Date this tax rate becomes effective (IE: Jun-29-2009)';
COMMENT ON COLUMN "tax_rates"."taxrateenddate" IS 'Date this tax rate ceases (IE: Jun-29-2009)';
COMMENT ON COLUMN "tax_rates"."taxratenotes" IS 'Tax Rate Notes';
COMMENT ON COLUMN "tax_rates"."taxratearchive" IS 'Archive this record?';

-- CREATE INDEXES ...
ALTER TABLE "tax_rates" ADD CONSTRAINT "tax_rates_pkey" PRIMARY KEY ("taxrateid");

CREATE TABLE IF NOT EXISTS "transactions"
 (
	"transactionid"			SERIAL,
	"reservationguestid"			INTEGER NOT NULL,
	"transdate"			TIMESTAMP WITHOUT TIME ZONE NOT NULL,
	"transtype"			VARCHAR (25) NOT NULL,
	"inventoryid"			INTEGER,
	"roomid"			INTEGER,
	"transquantity"			INTEGER NOT NULL,
	"transamount"			NUMERIC(15,2),
	"transgstamount"			NUMERIC(15,2),
	"transpstamount"			NUMERIC(15,2),
	"transhstamount"			NUMERIC(15,2),
	"transltamount"			NUMERIC(15,2),
	"transrtamount"			NUMERIC(15,2),
	"transhtamount"			NUMERIC(15,2),
	"transnotes"			TEXT,
	"transarchive"			BOOLEAN NOT NULL,
	"transdmtamount"			NUMERIC(15,2),
	"occupancyin"			TIMESTAMP WITHOUT TIME ZONE,
	"occupancyout"			TIMESTAMP WITHOUT TIME ZONE
);
COMMENT ON COLUMN "transactions"."reservationguestid" IS 'Reservation/Guest';
COMMENT ON COLUMN "transactions"."transdate" IS 'Transaction Date (IE: Jun-29-2009)';
COMMENT ON COLUMN "transactions"."transtype" IS 'Transaction Type';
COMMENT ON COLUMN "transactions"."inventoryid" IS 'Select Inventory Item from drop list';
COMMENT ON COLUMN "transactions"."roomid" IS 'Select Room from drop list';
COMMENT ON COLUMN "transactions"."transquantity" IS 'Quantity';
COMMENT ON COLUMN "transactions"."transamount" IS 'Transaction Amount.  Auto-completed field.  Gets data from Inventory table.   (Need Transaction Amount in Transaction table as price will change periodically in Inventory table.)';
COMMENT ON COLUMN "transactions"."transgstamount" IS 'GST.  Auto-calculated and completed field.';
COMMENT ON COLUMN "transactions"."transpstamount" IS 'PST.  Auto-calculated and completed field.';
COMMENT ON COLUMN "transactions"."transhstamount" IS 'HST.  Auto-calculated and completed field.';
COMMENT ON COLUMN "transactions"."transltamount" IS 'Liquor Tax.  Auto-calculated and completed field.';
COMMENT ON COLUMN "transactions"."transrtamount" IS 'Room Tax.  Auto-calculated and completed field.';
COMMENT ON COLUMN "transactions"."transhtamount" IS 'Hotel Tax.  Auto-calculated and completed field.';
COMMENT ON COLUMN "transactions"."transnotes" IS 'Transaction Notes';
COMMENT ON COLUMN "transactions"."transarchive" IS 'Archive this record?';
COMMENT ON COLUMN "transactions"."transdmtamount" IS 'Destination Marketing Tax.  Auto-calculated and completed field.';
COMMENT ON COLUMN "transactions"."occupancyin" IS 'Date occupancy in this room starts (IE: Jun-29-2009)';
COMMENT ON COLUMN "transactions"."occupancyout" IS 'Date occupancy in this room ends (IE: Jun-29-2009)';

-- CREATE INDEXES ...
CREATE INDEX "transactions_inventoryid_idx" ON "transactions" ("inventoryid");
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_pkey" PRIMARY KEY ("transactionid");
CREATE INDEX "transactions_reservationid_idx" ON "transactions" ("reservationguestid");
CREATE INDEX "transactions_roomid_idx" ON "transactions" ("roomid");

CREATE TABLE IF NOT EXISTS "transactions_backup"
 (
	"transactionid"			SERIAL,
	"reservationguestid"			INTEGER NOT NULL,
	"transdate"			TIMESTAMP WITHOUT TIME ZONE NOT NULL,
	"transtype"			VARCHAR (25) NOT NULL,
	"inventoryid"			INTEGER,
	"roomid"			INTEGER,
	"transquantity"			INTEGER NOT NULL,
	"transamount"			NUMERIC(15,2),
	"transgstamount"			NUMERIC(15,2),
	"transpstamount"			NUMERIC(15,2),
	"transhstamount"			NUMERIC(15,2),
	"transltamount"			NUMERIC(15,2),
	"transrtamount"			NUMERIC(15,2),
	"transhtamount"			NUMERIC(15,2),
	"transnotes"			TEXT,
	"transarchive"			BOOLEAN NOT NULL,
	"transdmtamount"			NUMERIC(15,2),
	"occupancyin"			TIMESTAMP WITHOUT TIME ZONE,
	"occupancyout"			TIMESTAMP WITHOUT TIME ZONE
);
COMMENT ON COLUMN "transactions_backup"."reservationguestid" IS 'Reservation/Guest';
COMMENT ON COLUMN "transactions_backup"."transdate" IS 'Transaction Date (IE: Jun-29-2009)';
COMMENT ON COLUMN "transactions_backup"."transtype" IS 'Transaction Type';
COMMENT ON COLUMN "transactions_backup"."inventoryid" IS 'Select Inventory Item from drop list';
COMMENT ON COLUMN "transactions_backup"."roomid" IS 'Select Room from drop list';
COMMENT ON COLUMN "transactions_backup"."transquantity" IS 'Quantity';
COMMENT ON COLUMN "transactions_backup"."transamount" IS 'Transaction Amount.  Auto-completed field.  Gets data from Inventory table.   (Need Transaction Amount in Transaction table as price will change periodically in Inventory table.)';
COMMENT ON COLUMN "transactions_backup"."transgstamount" IS 'GST.  Auto-calculated and completed field.';
COMMENT ON COLUMN "transactions_backup"."transpstamount" IS 'PST.  Auto-calculated and completed field.';
COMMENT ON COLUMN "transactions_backup"."transhstamount" IS 'HST.  Auto-calculated and completed field.';
COMMENT ON COLUMN "transactions_backup"."transltamount" IS 'Liquor Tax.  Auto-calculated and completed field.';
COMMENT ON COLUMN "transactions_backup"."transrtamount" IS 'Room Tax.  Auto-calculated and completed field.';
COMMENT ON COLUMN "transactions_backup"."transhtamount" IS 'Hotel Tax.  Auto-calculated and completed field.';
COMMENT ON COLUMN "transactions_backup"."transnotes" IS 'Transaction Notes';
COMMENT ON COLUMN "transactions_backup"."transarchive" IS 'Archive this record?';
COMMENT ON COLUMN "transactions_backup"."transdmtamount" IS 'Destination Marketing Tax.  Auto-calculated and completed field.';
COMMENT ON COLUMN "transactions_backup"."occupancyin" IS 'Date occupancy in this room starts (IE: Jun-29-2009)';
COMMENT ON COLUMN "transactions_backup"."occupancyout" IS 'Date occupancy in this room ends (IE: Jun-29-2009)';

-- CREATE INDEXES ...
CREATE INDEX "transactions_backup_inventoryid_idx" ON "transactions_backup" ("inventoryid");
ALTER TABLE "transactions_backup" ADD CONSTRAINT "transactions_backup_pkey" PRIMARY KEY ("transactionid");
CREATE INDEX "transactions_backup_reservationid_idx" ON "transactions_backup" ("reservationguestid");
CREATE INDEX "transactions_backup_roomid_idx" ON "transactions_backup" ("roomid");

CREATE TABLE IF NOT EXISTS "access_compact_errors"
 (
	"errorcode"			INTEGER,
	"errordescription"			TEXT,
	"errortable"			VARCHAR (255),
	"errorrecid"			BYTEA
);

-- CREATE INDEXES ...

CREATE TABLE IF NOT EXISTS "inventory_excel_import"
 (
	"invcode"			VARCHAR (255),
	"invitemdescription"			VARCHAR (255),
	"invamount"			NUMERIC(15,2)
);

-- CREATE INDEXES ...
CREATE UNIQUE INDEX "inventory_excel_import_invcode_idx" ON "inventory_excel_import" ("invcode");

CREATE TABLE IF NOT EXISTS "lookup_countries"
 (
	"countrycode"			VARCHAR (3) NOT NULL,
	"countryname"			VARCHAR (50)
);

-- CREATE INDEXES ...
ALTER TABLE "lookup_countries" ADD CONSTRAINT "lookup_countries_pkey" PRIMARY KEY ("countrycode");

CREATE TABLE IF NOT EXISTS "lookup_phone_fax_types"
 (
	"phonefaxtype"			VARCHAR (25) NOT NULL
);

-- CREATE INDEXES ...
CREATE INDEX "lookup_phone_fax_types_numbertype_idx" ON "lookup_phone_fax_types" ("phonefaxtype");
ALTER TABLE "lookup_phone_fax_types" ADD CONSTRAINT "lookup_phone_fax_types_pkey" PRIMARY KEY ("phonefaxtype");

CREATE TABLE IF NOT EXISTS "lookup_transaction_types"
 (
	"transactiontype"			VARCHAR (25) NOT NULL,
	"transactiontypeorder"			INTEGER
);

-- CREATE INDEXES ...
ALTER TABLE "lookup_transaction_types" ADD CONSTRAINT "lookup_transaction_types_pkey" PRIMARY KEY ("transactiontype");

CREATE TABLE IF NOT EXISTS "inventory_rates"
 (
	"inventoryid"			INTEGER,
	"invamount"			NUMERIC(15,2),
	"taxratetype"			VARCHAR (255),
	"tax"			VARCHAR (255)
);

-- CREATE INDEXES ...

CREATE TABLE IF NOT EXISTS "inventory_rates_2"
 (
	"transactionid"			INTEGER,
	"inventoryid"			INTEGER,
	"firstofinvamount"			NUMERIC(15,2),
	"gst"			VARCHAR (255),
	"pst"			VARCHAR (255),
	"hst"			VARCHAR (255),
	"liquor"			VARCHAR (255),
	"room"			VARCHAR (255),
	"hotel"			VARCHAR (255),
	"dmt"			VARCHAR (255)
);

-- CREATE INDEXES ...

CREATE TABLE IF NOT EXISTS "calc_tax_rate_filters"
 (
	"taxrateid"			SERIAL,
	"taxratetype"			VARCHAR (25),
	"taxrate"			DOUBLE PRECISION
);

-- CREATE INDEXES ...

CREATE TABLE IF NOT EXISTS "calc_tax_rate_filters_2"
 (
	"transid"			INTEGER,
	"gst"			DOUBLE PRECISION,
	"pst"			DOUBLE PRECISION,
	"hst"			DOUBLE PRECISION,
	"liquor"			DOUBLE PRECISION,
	"hotel"			DOUBLE PRECISION,
	"room"			DOUBLE PRECISION,
	"dmt"			DOUBLE PRECISION
);

-- CREATE INDEXES ...

CREATE TABLE IF NOT EXISTS "choose_room_rates"
 (
	"roomid"			INTEGER,
	"roomratetype"			VARCHAR (255),
	"roomrate"			NUMERIC(15,2),
	"taxratetype"			VARCHAR (255),
	"tax"			VARCHAR (255)
);

-- CREATE INDEXES ...

CREATE TABLE IF NOT EXISTS "choose_room_rates_2"
 (
	"transactionid"			INTEGER,
	"roomid"			INTEGER,
	"firstofroomrate"			NUMERIC(15,2),
	"gst"			VARCHAR (255),
	"pst"			VARCHAR (255),
	"hst"			VARCHAR (255),
	"room"			VARCHAR (255),
	"hotel"			VARCHAR (255),
	"dmt"			VARCHAR (255)
);

-- CREATE INDEXES ...

CREATE TABLE IF NOT EXISTS "inventory_taxes"
 (
	"inventoryid"			INTEGER,
	"invitemdescription"			VARCHAR (255),
	"invamount"			NUMERIC(15,2),
	"taxratetype"			VARCHAR (255),
	"tax"			VARCHAR (255)
);

-- CREATE INDEXES ...

CREATE TABLE IF NOT EXISTS "inventory_taxes_2"
 (
	"transactionid"			INTEGER,
	"inventoryid"			INTEGER,
	"firstofinvamount"			NUMERIC(15,2),
	"gst"			VARCHAR (255),
	"pst"			VARCHAR (255),
	"hst"			VARCHAR (255),
	"liquor"			VARCHAR (255),
	"room"			VARCHAR (255),
	"hotel"			VARCHAR (255),
	"dmt"			VARCHAR (255)
);

-- CREATE INDEXES ...


-- CREATE Relationships ...
ALTER TABLE "room_rates" ADD CONSTRAINT "room_rates_roomid_fk" FOREIGN KEY ("roomid") REFERENCES "rooms"("roomid") DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE "room_assignments_backup" ADD CONSTRAINT "room_assignments_backup_reservationguestid_fk" FOREIGN KEY ("reservationguestid") REFERENCES "reservation_guests_backup"("reservationguestid") ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE "room_assignments" ADD CONSTRAINT "room_assignments_reservationguestid_fk" FOREIGN KEY ("reservationguestid") REFERENCES "reservation_guests"("reservationguestid") ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_reservationguestid_fk" FOREIGN KEY ("reservationguestid") REFERENCES "reservation_guests"("reservationguestid") ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE "reservation_guests" ADD CONSTRAINT "reservation_guests_reservationid_fk" FOREIGN KEY ("reservationid") REFERENCES "reservations"("reservationid") ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE "payments_backup" ADD CONSTRAINT "payments_backup_reservationguestid_fk" FOREIGN KEY ("reservationguestid") REFERENCES "reservation_guests_backup"("reservationguestid") ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE "reservation_guests_backup" ADD CONSTRAINT "reservation_guests_backup_reservationid_fk" FOREIGN KEY ("reservationid") REFERENCES "reservations_backup"("reservationid") ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE "transactions_backup" ADD CONSTRAINT "transactions_backup_reservationguestid_fk" FOREIGN KEY ("reservationguestid") REFERENCES "reservation_guests_backup"("reservationguestid") ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE "housekeeping_notes_backup" ADD CONSTRAINT "housekeeping_notes_backup_reservationguestid_fk" FOREIGN KEY ("reservationguestid") REFERENCES "reservation_guests_backup"("reservationguestid") ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE "housekeeping_notes" ADD CONSTRAINT "housekeeping_notes_reservationguestid_fk" FOREIGN KEY ("reservationguestid") REFERENCES "reservation_guests"("reservationguestid") ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_reservationguestid_fk" FOREIGN KEY ("reservationguestid") REFERENCES "reservation_guests"("reservationguestid") ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE "reservation_guests" ADD CONSTRAINT "reservation_guests_guestid_fk" FOREIGN KEY ("guestid") REFERENCES "guests"("guestid") DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE "shuttles" ADD CONSTRAINT "shuttles_reservationguestid_fk" FOREIGN KEY ("reservationguestid") REFERENCES "reservation_guests"("reservationguestid") DEFERRABLE INITIALLY IMMEDIATE;

-- Access source table mapping for Supabase users.
comment on table "application_information" is 'Access source: tblApplicationInformation. Table renamed to snake_case for Supabase readability; columns preserve mdbtools-normalized Access field names.';
comment on table "application_information_from_back" is 'Access source: tblApplicationInformationFROMBACK. Table renamed to snake_case for Supabase readability; columns preserve mdbtools-normalized Access field names.';
comment on table "application_objects" is 'Access source: tblApplicationObjects. Table renamed to snake_case for Supabase readability; columns preserve mdbtools-normalized Access field names.';
comment on table "application_registration" is 'Access source: tblApplicationRegistration. Table renamed to snake_case for Supabase readability; columns preserve mdbtools-normalized Access field names.';
comment on table "application_specifications" is 'Access source: tblApplicationSpecification. Table renamed to snake_case for Supabase readability; columns preserve mdbtools-normalized Access field names.';
comment on table "application_versions" is 'Access source: tblApplicationVersion. Table renamed to snake_case for Supabase readability; columns preserve mdbtools-normalized Access field names.';
comment on table "exchange_rates" is 'Access source: tblExchangeRate. Table renamed to snake_case for Supabase readability; columns preserve mdbtools-normalized Access field names.';
comment on table "guests" is 'Access source: tblGuest. Table renamed to snake_case for Supabase readability; columns preserve mdbtools-normalized Access field names.';
comment on table "housekeeping_notes" is 'Access source: tblHousekeeping. Table renamed to snake_case for Supabase readability; columns preserve mdbtools-normalized Access field names.';
comment on table "housekeeping_notes_backup" is 'Access source: tblHousekeepingBACKUP. Table renamed to snake_case for Supabase readability; columns preserve mdbtools-normalized Access field names.';
comment on table "inventory_items" is 'Access source: tblInventory. Table renamed to snake_case for Supabase readability; columns preserve mdbtools-normalized Access field names.';
comment on table "kitchen_meals" is 'Access source: tblKitchenMeal. Table renamed to snake_case for Supabase readability; columns preserve mdbtools-normalized Access field names.';
comment on table "kitchen_meals_new" is 'Access source: tblKitchenMealNEW. Table renamed to snake_case for Supabase readability; columns preserve mdbtools-normalized Access field names.';
comment on table "lookup_cities" is 'Access source: tblLookupCity. Table renamed to snake_case for Supabase readability; columns preserve mdbtools-normalized Access field names.';
comment on table "lookup_guest_diets" is 'Access source: tblLookupGuestDiet. Table renamed to snake_case for Supabase readability; columns preserve mdbtools-normalized Access field names.';
comment on table "lookup_inventory_codes" is 'Access source: tblLookupInventoryCode. Table renamed to snake_case for Supabase readability; columns preserve mdbtools-normalized Access field names.';
comment on table "lookup_inventory_types" is 'Access source: tblLookupInventoryType. Table renamed to snake_case for Supabase readability; columns preserve mdbtools-normalized Access field names.';
comment on table "lookup_payment_categories" is 'Access source: tblLookupPaymentCategory. Table renamed to snake_case for Supabase readability; columns preserve mdbtools-normalized Access field names.';
comment on table "lookup_payment_codes" is 'Access source: tblLookupPaymentCode. Table renamed to snake_case for Supabase readability; columns preserve mdbtools-normalized Access field names.';
comment on table "lookup_payment_types" is 'Access source: tblLookupPaymentType. Table renamed to snake_case for Supabase readability; columns preserve mdbtools-normalized Access field names.';
comment on table "lookup_regions" is 'Access source: tblLookupRegion. Table renamed to snake_case for Supabase readability; columns preserve mdbtools-normalized Access field names.';
comment on table "lookup_room_rate_codes" is 'Access source: tblLookupRoomRateCode. Table renamed to snake_case for Supabase readability; columns preserve mdbtools-normalized Access field names.';
comment on table "lookup_room_rate_types" is 'Access source: tblLookupRoomRateType. Table renamed to snake_case for Supabase readability; columns preserve mdbtools-normalized Access field names.';
comment on table "lookup_room_types" is 'Access source: tblLookupRoomType. Table renamed to snake_case for Supabase readability; columns preserve mdbtools-normalized Access field names.';
comment on table "lookup_salutations" is 'Access source: tblLookupSalutation. Table renamed to snake_case for Supabase readability; columns preserve mdbtools-normalized Access field names.';
comment on table "lookup_shuttle_sites" is 'Access source: tblLookupShuttleSite. Table renamed to snake_case for Supabase readability; columns preserve mdbtools-normalized Access field names.';
comment on table "lookup_tax_rate_types" is 'Access source: tblLookupTaxRateType. Table renamed to snake_case for Supabase readability; columns preserve mdbtools-normalized Access field names.';
comment on table "lookup_users" is 'Access source: tblLookupUser. Table renamed to snake_case for Supabase readability; columns preserve mdbtools-normalized Access field names.';
comment on table "mailouts" is 'Access source: tblMailout. Table renamed to snake_case for Supabase readability; columns preserve mdbtools-normalized Access field names.';
comment on table "room_assignments" is 'Access source: tblOccupancy. Table renamed to snake_case for Supabase readability; columns preserve mdbtools-normalized Access field names.';
comment on table "room_assignments_backup" is 'Access source: tblOccupancyBACKUP. Table renamed to snake_case for Supabase readability; columns preserve mdbtools-normalized Access field names.';
comment on table "payments" is 'Access source: tblPayment. Table renamed to snake_case for Supabase readability; columns preserve mdbtools-normalized Access field names.';
comment on table "payments_backup" is 'Access source: tblPaymentBACKUP. Table renamed to snake_case for Supabase readability; columns preserve mdbtools-normalized Access field names.';
comment on table "payment_type_zero" is 'Access source: tblPaymentTypeZero. Table renamed to snake_case for Supabase readability; columns preserve mdbtools-normalized Access field names.';
comment on table "payment_zero" is 'Access source: tblPaymentZero. Table renamed to snake_case for Supabase readability; columns preserve mdbtools-normalized Access field names.';
comment on table "reservation_board" is 'Access source: tblResBoard. Table renamed to snake_case for Supabase readability; columns preserve mdbtools-normalized Access field names.';
comment on table "reservations" is 'Access source: tblReservation. Table renamed to snake_case for Supabase readability; columns preserve mdbtools-normalized Access field names.';
comment on table "reservations_backup" is 'Access source: tblReservationBACKUP. Table renamed to snake_case for Supabase readability; columns preserve mdbtools-normalized Access field names.';
comment on table "reservation_guests" is 'Access source: tblReservationGuest. Table renamed to snake_case for Supabase readability; columns preserve mdbtools-normalized Access field names.';
comment on table "reservation_guests_backup" is 'Access source: tblReservationGuestBACKUP. Table renamed to snake_case for Supabase readability; columns preserve mdbtools-normalized Access field names.';
comment on table "rooms" is 'Access source: tblRoom. Table renamed to snake_case for Supabase readability; columns preserve mdbtools-normalized Access field names.';
comment on table "room_rates" is 'Access source: tblRoomRate. Table renamed to snake_case for Supabase readability; columns preserve mdbtools-normalized Access field names.';
comment on table "room_rates_new" is 'Access source: tblRoomRateNEW. Table renamed to snake_case for Supabase readability; columns preserve mdbtools-normalized Access field names.';
comment on table "shuttles" is 'Access source: tblShuttle. Table renamed to snake_case for Supabase readability; columns preserve mdbtools-normalized Access field names.';
comment on table "tax_rates" is 'Access source: tblTaxRate. Table renamed to snake_case for Supabase readability; columns preserve mdbtools-normalized Access field names.';
comment on table "transactions" is 'Access source: tblTransaction. Table renamed to snake_case for Supabase readability; columns preserve mdbtools-normalized Access field names.';
comment on table "transactions_backup" is 'Access source: tblTransactionBACKUP. Table renamed to snake_case for Supabase readability; columns preserve mdbtools-normalized Access field names.';
comment on table "access_compact_errors" is 'Access source: MSysCompactError. Table renamed to snake_case for Supabase readability; columns preserve mdbtools-normalized Access field names.';
comment on table "inventory_excel_import" is 'Access source: tblInventoryExcel. Table renamed to snake_case for Supabase readability; columns preserve mdbtools-normalized Access field names.';
comment on table "lookup_countries" is 'Access source: tblLookupCountry. Table renamed to snake_case for Supabase readability; columns preserve mdbtools-normalized Access field names.';
comment on table "lookup_phone_fax_types" is 'Access source: tblLookupPhoneFaxType. Table renamed to snake_case for Supabase readability; columns preserve mdbtools-normalized Access field names.';
comment on table "lookup_transaction_types" is 'Access source: tblLookupTransactionType. Table renamed to snake_case for Supabase readability; columns preserve mdbtools-normalized Access field names.';
comment on table "inventory_rates" is 'Access source: tblInventoryRate. Table renamed to snake_case for Supabase readability; columns preserve mdbtools-normalized Access field names.';
comment on table "inventory_rates_2" is 'Access source: tblInventoryRate2. Table renamed to snake_case for Supabase readability; columns preserve mdbtools-normalized Access field names.';
comment on table "calc_tax_rate_filters" is 'Access source: tblCalcTaxRateFilter. Table renamed to snake_case for Supabase readability; columns preserve mdbtools-normalized Access field names.';
comment on table "calc_tax_rate_filters_2" is 'Access source: tblCalcTaxRateFilter2. Table renamed to snake_case for Supabase readability; columns preserve mdbtools-normalized Access field names.';
comment on table "choose_room_rates" is 'Access source: tblChooseRoomRate. Table renamed to snake_case for Supabase readability; columns preserve mdbtools-normalized Access field names.';
comment on table "choose_room_rates_2" is 'Access source: tblChooseRoomRate2. Table renamed to snake_case for Supabase readability; columns preserve mdbtools-normalized Access field names.';
comment on table "inventory_taxes" is 'Access source: tblInventoryTax. Table renamed to snake_case for Supabase readability; columns preserve mdbtools-normalized Access field names.';
comment on table "inventory_taxes_2" is 'Access source: tblInventoryTax2. Table renamed to snake_case for Supabase readability; columns preserve mdbtools-normalized Access field names.';
