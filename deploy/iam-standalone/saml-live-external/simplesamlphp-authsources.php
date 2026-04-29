<?php

$config = [
    'default-sp' => [
        'saml:SP',
        'entityID' => getenv('SIMPLESAMLPHP_SP_ENTITY_ID') ?: 'https://127.0.0.1:19443/simplesaml/module.php/saml/sp/metadata.php/default-sp',
        'idp' => 'http://127.0.0.1:4000/api/v1/iam/realms/realm-idp-default/protocol/saml/metadata?client_id=saml-test-service-provider-live-local',
        'discoURL' => null,
        'assertion.encryption' => false,
        'NameIDPolicy' => [
            'Format' => 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
            'AllowCreate' => false,
        ],
    ],
];
