// The 'test_advance_privacy' test program.
import advance_privacy.aleo;
program test_advance_privacy.aleo {
    @test
    script test_it() {
        let result: u32 = advance_privacy.aleo/main(1u32, 2u32);
        assert_eq(result, 3u32);
    }

    @test
    @should_fail
    transition do_nothing() {
        let result: u32 = advance_privacy.aleo/main(2u32, 3u32);
        assert_eq(result, 3u32);
    }

    @noupgrade
    async constructor() {}
}
