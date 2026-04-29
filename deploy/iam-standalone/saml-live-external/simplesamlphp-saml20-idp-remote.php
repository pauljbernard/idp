<?php

$metadata['http://127.0.0.1:4000/api/v1/iam/realms/realm-idp-default/protocol/saml/metadata?client_id=saml-test-service-provider-live-local'] = [
    'SingleSignOnService' => [
        [
            'Binding' => 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect',
            'Location' => 'http://127.0.0.1:4000/api/v1/iam/realms/realm-idp-default/protocol/saml/auth?client_id=saml-test-service-provider-live-local&binding=REDIRECT',
        ],
    ],
    'SingleLogoutService' => [
        [
            'Binding' => 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect',
            'Location' => 'http://127.0.0.1:4000/api/v1/iam/realms/realm-idp-default/protocol/saml/logout',
        ],
    ],
];
